import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

type PrizePaidNotice = {
  userId: number;
  tournamentId: number;
  entryId: number;
  payoutId: number;
  tournamentName: string;
  position: number | null;
  amountCOP: number;
  paidAt: Date;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyPrizePaid(notice: PrizePaidNotice) {
    const title = 'Tu premio fue pagado';
    const body = this.prizePaidText(notice);
    const existing = await this.prisma.notification.findUnique({
      where: { payoutId: notice.payoutId },
      select: { id: true },
    });

    if (!existing) {
      await this.prisma.notification.create({
        data: {
          userId: notice.userId,
          kind: 'PRIZE_PAID',
          title,
          body,
          tournamentId: notice.tournamentId,
          entryId: notice.entryId,
          payoutId: notice.payoutId,
        },
      });
    }

    await this.sendMail(
      notice.userId,
      title,
      body,
      'No se pudo enviar el correo del premio pagado.',
    );
  }

  async notifySlipPaid(notice: {
    userId: number;
    incomingId: number;
    tournamentId: number;
    entryId: number;
    amountCOP: number;
  }) {
    const title = 'Apuesta habilitada';
    const body = 'Tu apuesta ya se encuentra habilitada para participar.';

    try {
      await this.prisma.notification.create({
        data: {
          userId: notice.userId,
          kind: 'SLIP_PAID',
          title,
          body,
          tournamentId: notice.tournamentId,
          entryId: notice.entryId,
          incomingId: notice.incomingId,
        },
      });
    } catch {
      try {
        await this.prisma.notification.create({
          data: {
            userId: notice.userId,
            kind: 'SLIP_PAID',
            title,
            body,
            tournamentId: notice.tournamentId,
            entryId: notice.entryId,
          },
        });
      } catch {
        return;
      }
    }

    await this.sendMail(
      notice.userId,
      title,
      body,
      'No se pudo enviar el correo de polla habilitada.',
    );
  }

  async notifyPaymentReceived(notice: {
    userId: number;
    incomingId: number;
    tournamentId: number;
    entryId: number;
    amountCOP: number;
  }) {
    const player = await this.prisma.user.findUnique({
      where: { id: notice.userId },
      select: { name: true },
    });
    const amount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(notice.amountCOP);
    const who = player?.name?.trim() || 'Un jugador';

    await this.notifyIncoming({
      incomingId: notice.incomingId,
      kind: 'PAYMENT_ASIGNADO',
      title: 'Llegó un pago',
      body: `Entró ${amount}. ${who} ya quedó habilitado para apostar.`,
    });
    await this.notifySlipPaid(notice);
  }

  async notifyIncoming(notice: {
    incomingId: number;
    kind: string;
    title: string;
    body: string;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            kind: notice.kind,
            title: notice.title,
            body: notice.body,
            incomingId: notice.incomingId,
          },
        });
      } catch {
        continue;
      }

      await this.sendMail(
        admin.id,
        notice.title,
        notice.body,
        'No se pudo enviar el correo del abono.',
      );
    }
  }

  async list(userId: number) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, kind: { not: 'PAYMENT_NUEVO' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          kind: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null, kind: { not: 'PAYMENT_NUEVO' } },
      }),
    ]);

    return { unreadCount, items };
  }

  async markRead(userId: number, id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new NotFoundException('La notificación no existe.');
    }

    const updated = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    if (updated.count === 0) {
      const own = await this.prisma.notification.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!own) {
        throw new NotFoundException('La notificación no existe.');
      }
    }

    return { read: true };
  }

  private prizePaidText(notice: PrizePaidNotice) {
    const amount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(notice.amountCOP);
    const when = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    }).format(notice.paidAt);
    const place = notice.position
      ? `, puesto ${notice.position},`
      : '';

    return (
      `Tu premio de ${notice.tournamentName}${place} por ${amount} ` +
      `fue pagado el ${when}. El pago quedó registrado y el saldo de este premio quedó en cero.`
    );
  }

  private async sendMail(
    userId: number,
    subject: string,
    text: string,
    failure: string,
  ) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;
    if (!host || !user || !pass || !from) return;

    const port = Number(process.env.SMTP_PORT || '465');
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;

    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!account?.email) return;

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      await transporter.sendMail({
        from,
        to: account.email,
        subject: `Total Gol - ${subject}`,
        text,
      });
    } catch {
      this.logger.warn(failure);
    }
  }
}
