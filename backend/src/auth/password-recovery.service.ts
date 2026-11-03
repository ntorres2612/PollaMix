import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private mailConfig() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;
    const frontend = process.env.FRONTEND_URL;

    if (!host || !user || !pass || !from || !frontend) {
      return null;
    }

    const port = Number(process.env.SMTP_PORT || '465');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }

    let url: URL;
    try {
      url = new URL(frontend);
    } catch {
      return null;
    }

    if (
      url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )
    ) {
      return null;
    }

    if (url.username || url.password || url.search || url.hash) {
      return null;
    }

    return { host, user, pass, from, port, frontend: url.origin };
  }

  async requestReset(email: string) {
    const genericResponse = {
      message:
        'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
    };

    const config = this.mailConfig();

    // No generar tokens si el servicio de correo no está configurado.
    if (!config) {
      return genericResponse;
    }

    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true },
    });

    if (!user) return genericResponse;

    // Evitar múltiples solicitudes para la misma cuenta en 60 segundos.
    const recent = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
      select: { id: true },
    });

    if (recent) return genericResponse;

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60_000);

    const record = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
      select: { id: true },
    });

    const link = new URL('/reset-password', config.frontend);
    link.searchParams.set('token', token);

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      await transporter.sendMail({
        from: config.from,
        to: user.email,
        subject: 'PollaMix - Recuperación de contraseña',
        text:
          'Recibimos una solicitud para cambiar tu contraseña.\n\n' +
          'Abre este enlace (válido por 15 minutos):\n' +
          link.toString() +
          '\n\nSi no solicitaste el cambio, ignora este mensaje.',
      });
    } catch {
      // El enlace no enviado no debe quedar disponible.
      await this.prisma.passwordResetToken.deleteMany({
        where: { id: record.id, usedAt: null },
      });
      this.logger.warn('No se pudo enviar un correo de recuperación.');
    }

    return genericResponse;
  }

  async confirmReset(token: string, password: string) {
    const invalid = new BadRequestException(
      'El enlace de recuperación es inválido o ha expirado.',
    );

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw invalid;
    }

    const tokenHash = this.hashToken(token);

    // No mostrar nunca tokens ni contraseñas en los logs.
    const passwordHash = await bcrypt.hash(password, 12);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw invalid;
    }

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (consumed.count !== 1) {
        throw invalid;
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      });

      // Invalidar otros enlaces pendientes de la misma cuenta.
      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
