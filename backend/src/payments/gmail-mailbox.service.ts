import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { IncomingTransfersService } from './incoming-transfers.service';
import { openToken, readMailboxState, sealToken, signMailboxState } from './mailbox-secret';
import {
  fromDomain,
  INSCRIPTION_COP,
  readTestAmount,
  senderAuthenticated,
} from './payment-notice';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

@Injectable()
export class GmailMailboxService {
  private readonly logger = new Logger(GmailMailboxService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly incoming: IncomingTransfersService,
  ) {}

  status() {
    return this.prisma.mailboxConnection.findFirst({
      orderBy: { id: 'desc' },
      select: {
        lastSyncAt: true,
        lastError: true,
      },
    }).then((connection) => ({
      configured: this.configured(),
      connected: Boolean(connection),
      redirectUri: this.redirectUri(),
      acceptedAmount: readTestAmount() ?? INSCRIPTION_COP,
      lastSyncAt: connection?.lastSyncAt ?? null,
      lastError: connection?.lastError ?? null,
    }));
  }

  connectUrl(userId: number) {
    if (!this.configured()) {
      throw new BadRequestException(
        'Falta configurar el acceso de Google en el servidor.',
      );
    }

    const state = signMailboxState(userId, this.secret());
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: GMAIL_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }

  saveCredentials(clientId: string, clientSecret: string) {
    const id = clientId.trim();
    const secret = clientSecret.trim();
    if (!/^[0-9A-Za-z-]+\.apps\.googleusercontent\.com$/.test(id)) {
      throw new BadRequestException('El ID de cliente no tiene el formato de Google.');
    }
    if (!/^[\w.-]{10,200}$/.test(secret)) {
      throw new BadRequestException('El secreto de cliente no es válido.');
    }

    const file = this.envFile();
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    writeFileSync(file, upsertEnv(current, {
      GOOGLE_CLIENT_ID: id,
      GOOGLE_CLIENT_SECRET: secret,
    }), { mode: 0o600 });
    process.env.GOOGLE_CLIENT_ID = id;
    process.env.GOOGLE_CLIENT_SECRET = secret;
    return { configured: true };
  }

  async finishConnect(input: { code: string; state: string; error: string }) {
    const fail = (code: string) => this.front(`/admin/pagos?correo=${code}`);
    if (input.error) return fail('denegado');
    if (!this.configured() || !input.code || !input.state) return fail('estado');

    const userId = readMailboxState(input.state, this.secret());
    if (!userId) return fail('estado');

    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (admin?.role !== 'ADMIN') return fail('permiso');

      const token = await this.tokenRequest({
        code: input.code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri(),
      });
      if (!token.refresh_token || !token.access_token) return fail('permiso');

      const profile = await this.gmail<{ emailAddress?: string }>(
        token.access_token,
        '/users/me/profile',
      );
      const email = profile.emailAddress?.trim().toLowerCase() ?? '';
      if (!email.includes('@')) return fail('correo');

      await this.prisma.mailboxConnection.deleteMany();
      await this.prisma.mailboxConnection.create({
        data: {
          email,
          refreshToken: sealToken(token.refresh_token, this.secret()),
          connectedById: userId,
        },
      });
      return this.front('/admin/pagos?correo=conectado');
    } catch {
      this.logger.warn('No se pudo conectar el buzón de abonos.');
      return fail('token');
    }
  }

  async disconnect() {
    await this.prisma.mailboxConnection.deleteMany();
    return { connected: false };
  }

  @Interval(10000)
  async syncBankNotices() {
    return this.sync();
  }

  async sync() {
    if (this.running || !this.configured()) return { imported: 0 };
    const connection = await this.prisma.mailboxConnection.findFirst({
      orderBy: { id: 'desc' },
    });
    if (!connection) return { imported: 0 };

    this.running = true;
    try {
      const access = await this.accessToken(connection.id, connection.refreshToken);
      const listed = await this.gmail<{ messages?: Array<{ id: string }> }>(
        access,
        '/users/me/messages?maxResults=20&q=' +
          encodeURIComponent(
            'newer_than:14d (recibiste OR abono OR "te envió" OR "te envio" OR "te han enviado" OR GP)',
          ),
      );

      let imported = 0;
      for (const item of listed.messages ?? []) {
        const known = await this.prisma.incomingTransfer.findUnique({
          where: { externalId: item.id },
          select: { id: true },
        });
        if (known) continue;

        const message = await this.gmail<GmailMessage>(
          access,
          `/users/me/messages/${encodeURIComponent(item.id)}?format=full`,
        );
        const headers = message.payload?.headers ?? [];
        const domain = fromDomain(header(headers, 'from'));
        const receivedAt = message.internalDate
          ? new Date(Number(message.internalDate))
          : new Date();
        await this.incoming.record({
          externalId: message.id,
          fromDomain: domain,
          receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
          authenticated: senderAuthenticated(headers, domain),
          subject: header(headers, 'subject'),
          body: messageText(message.payload),
        });
        imported += 1;
      }

      await this.prisma.mailboxConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date(), lastError: null },
      });
      return { imported };
    } catch {
      this.logger.warn('No se pudo leer el buzón de abonos.');
      await this.prisma.mailboxConnection.update({
        where: { id: connection.id },
        data: { lastError: 'No se pudo leer el buzón. Vuelve a conectar el Gmail.' },
      }).catch(() => undefined);
      return { imported: 0 };
    } finally {
      this.running = false;
    }
  }

  private async accessToken(connectionId: number, sealed: string) {
    const refreshToken = openToken(sealed, this.secret());
    const token = await this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (token.refresh_token) {
      await this.prisma.mailboxConnection.update({
        where: { id: connectionId },
        data: { refreshToken: sealToken(token.refresh_token, this.secret()) },
      });
    }
    if (!token.access_token) {
      throw new Error('Sin acceso al buzón.');
    }
    return token.access_token;
  }

  private async tokenRequest(fields: Record<string, string>) {
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      ...fields,
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const code =
        detail && typeof detail.error === 'string' ? detail.error : 'rechazado';
      this.logger.warn(`Google no entregó el acceso del buzón (${code}).`);
      throw new Error('Token rechazado.');
    }
    return (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
  }

  private async gmail<T>(accessToken: string, path: string) {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Gmail rechazó la consulta.');
    return (await response.json()) as T;
  }

  private configured() {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() &&
        process.env.GOOGLE_CLIENT_SECRET?.trim(),
    );
  }

  private redirectUri() {
    return (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      'http://localhost:3001/payments/mailbox/callback'
    );
  }

  private secret() {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      throw new Error('JWT_SECRET es obligatorio.');
    }
    return secret;
  }

  private envFile() {
    const candidates = [
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), 'backend/.env'),
    ];
    return candidates.find((file) => existsSync(file)) ?? candidates[0];
  }

  private front(path: string) {
    const base = process.env.FRONTEND_URL?.trim() || 'http://localhost:3000';
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
  }
}

type GmailHeader = { name: string; value: string };

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};

type GmailMessage = {
  id: string;
  internalDate?: string;
  payload?: GmailPart;
};

function upsertEnv(source: string, updates: Record<string, string>) {
  const keys = new Set(Object.keys(updates));
  const kept = source.split(/\r?\n/).filter((line) => {
    const match = line.match(/^([A-Za-z0-9_]+)=/);
    return !(match && keys.has(match[1]));
  });
  while (kept.length > 0 && kept[kept.length - 1] === '') kept.pop();
  for (const [key, value] of Object.entries(updates)) {
    kept.push(`${key}=${value}`);
  }
  return `${kept.join('\n')}\n`;
}

function header(headers: GmailHeader[], name: string) {
  return headers.find((item) => item.name.toLowerCase() === name)?.value ?? '';
}

function messageText(part: GmailPart | undefined) {
  const chunks: string[] = [];
  collect(part, chunks);
  const plain = chunks.find((chunk) => !chunk.startsWith('<'));
  return (plain ?? chunks[0] ?? '').slice(0, 15000);
}

function collect(part: GmailPart | undefined, chunks: string[]) {
  if (!part) return;
  if (
    part.body?.data &&
    (part.mimeType === 'text/plain' || part.mimeType === 'text/html')
  ) {
    chunks.push(Buffer.from(part.body.data, 'base64url').toString('utf8'));
  }
  for (const child of part.parts ?? []) collect(child, chunks);
}
