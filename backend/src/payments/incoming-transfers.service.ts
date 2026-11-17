import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from './payments.service';
import {
  amountFits,
  decideNotice,
  domainAllowed,
  isExpectedAmount,
  namesMatch,
  noticeDomains,
  parsePaymentNotice,
  readTestAmount,
} from './payment-notice';

export type BankMail = {
  externalId: string;
  fromDomain: string;
  receivedAt: Date;
  authenticated: boolean;
  subject: string;
  body: string;
};

@Injectable()
export class IncomingTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async record(mail: BankMail) {
    if (!mail.externalId || mail.externalId.length > 200) return;

    const parsed = parsePaymentNotice(mail.subject, mail.body);
    const allowlisted = domainAllowed(mail.fromDomain, noticeDomains());
    const worthReading =
      parsed.looksLikeCredit &&
      parsed.amountCOP !== null &&
      parsed.amountCOP > 0 &&
      (allowlisted || parsed.paymentCode !== null || parsed.ambiguousCode);

    if (!worthReading) {
      await this.remember(mail, 0, 'OMITIDO', null);
      return;
    }

    const referenceAlreadyUsed = parsed.bankReference
      ? Boolean(
          await this.prisma.incomingTransfer.findUnique({
            where: { bankReference: parsed.bankReference },
            select: { id: true },
          }),
        )
      : false;

    const testAmount = readTestAmount();
    const payment = parsed.paymentCode
      ? await this.prisma.payment.findUnique({
          where: { id: parsed.paymentCode },
          select: {
            id: true,
            amount: true,
            status: true,
            entryId: true,
            userId: true,
            tournamentId: true,
          },
        })
      : await this.paymentBySender(
          parsed.payerName,
          parsed.amountCOP,
          testAmount,
        );

    const identified = !parsed.paymentCode && Boolean(payment);
    let decision = decideNotice({
      looksLikeCredit: parsed.looksLikeCredit,
      amountCOP: parsed.amountCOP,
      allowlisted,
      authenticated: mail.authenticated,
      paymentCode: parsed.paymentCode,
      ambiguousCode: parsed.ambiguousCode,
      referenceAlreadyUsed,
      paymentStatus: payment
        ? (payment.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED')
        : parsed.paymentCode
          ? 'MISSING'
          : null,
      amountMatches: Boolean(
        payment &&
          parsed.amountCOP !== null &&
          amountFits(parsed.amountCOP, Number(payment.amount), testAmount),
      ),
      hasEntry: Boolean(payment?.entryId),
      identified,
      expectedAmount:
        parsed.amountCOP !== null &&
        isExpectedAmount(parsed.amountCOP, testAmount),
    });

    const created = await this.remember(
      mail,
      parsed.amountCOP ?? 0,
      decision.status,
      referenceAlreadyUsed ? null : parsed.bankReference,
      parsed.payerName,
      parsed.concept,
    );
    if (!created || decision.status === 'OMITIDO') return;

    if (decision.approve && payment) {
      try {
        await this.payments.updateStatus(payment.id, { status: 'APPROVED' });
        await this.prisma.incomingTransfer.update({
          where: { id: created.id },
          data: { paymentId: payment.id, status: 'ASIGNADO' },
        });
      } catch {
        decision = {
          status: 'REVISAR',
          approve: false,
          reason: 'El abono coincide, pero ese pronóstico no se pudo aprobar solo.',
        };
        await this.prisma.incomingTransfer.update({
          where: { id: created.id },
          data: { status: 'REVISAR', paymentId: null },
        });
      }
    }

    if (decision.status === 'ASIGNADO' && payment?.entryId) {
      await this.notifications.notifyPaymentReceived({
        userId: payment.userId,
        incomingId: created.id,
        tournamentId: payment.tournamentId,
        entryId: payment.entryId,
        amountCOP: parsed.amountCOP ?? 0,
      });
      return;
    }

    const code = parsed.paymentCode ? ` El mensaje trae GP${parsed.paymentCode}.` : '';
    await this.notifications.notifyIncoming({
      incomingId: created.id,
      kind: `PAYMENT_${decision.status}`,
      title:
        decision.status === 'DUPLICADO'
          ? 'Ese pago ya estaba registrado'
          : 'Entró un aviso de pago para revisar',
      body: `Llegó un aviso por ${pesos(parsed.amountCOP ?? 0)}.${code} ${decision.reason}`,
    });
  }

  private async paymentBySender(
    payerName: string | null,
    amountCOP: number | null,
    testAmount: number | null,
  ) {
    if (!payerName || amountCOP === null) return null;

    const pending = await this.prisma.payment.findMany({
      where: { status: 'PENDING', entryId: { not: null } },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        entryId: true,
        userId: true,
        tournamentId: true,
        user: { select: { name: true } },
      },
    });

    const named = pending.filter(
      (item) =>
        amountFits(amountCOP, Number(item.amount), testAmount) &&
        namesMatch(payerName, item.user.name),
    );
    if (named.length === 0) return null;
    if (!named.every((item) => item.userId === named[0].userId)) return null;

    return {
      id: named[0].id,
      amount: named[0].amount,
      status: named[0].status,
      entryId: named[0].entryId,
      userId: named[0].userId,
      tournamentId: named[0].tournamentId,
    };
  }

  async list() {
    return this.prisma.incomingTransfer.findMany({
      where: { status: { notIn: ['OMITIDO', 'NUEVO'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amountCOP: true,
        payerName: true,
        concept: true,
        receivedAt: true,
        status: true,
        paymentId: true,
        authenticated: true,
        fromDomain: true,
      },
    });
  }

  async assign(incomingId: number, paymentId: number) {
    if (
      !Number.isSafeInteger(incomingId) ||
      incomingId <= 0 ||
      !Number.isSafeInteger(paymentId) ||
      paymentId <= 0
    ) {
      throw new BadRequestException('El abono o el pago no es válido.');
    }

    const incoming = await this.prisma.incomingTransfer.findUnique({
      where: { id: incomingId },
    });
    if (!incoming || incoming.status === 'OMITIDO') {
      throw new NotFoundException('El abono no existe.');
    }
    if (incoming.status === 'ASIGNADO' || incoming.status === 'DUPLICADO') {
      throw new BadRequestException('Ese abono ya quedó registrado.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('El pago no existe.');
    }
    if (payment.status !== 'PENDING' || !payment.entryId) {
      throw new BadRequestException('Ese pago no está pendiente de aprobación.');
    }
    if (!amountFits(incoming.amountCOP, Number(payment.amount), readTestAmount())) {
      throw new BadRequestException('El valor del abono no coincide con la inscripción.');
    }

    const linked = await this.prisma.incomingTransfer.findUnique({
      where: { paymentId },
      select: { id: true },
    });
    if (linked) {
      throw new BadRequestException('Ese pronóstico ya tiene un abono asignado.');
    }

    await this.payments.updateStatus(paymentId, { status: 'APPROVED' });
    await this.prisma.incomingTransfer.update({
      where: { id: incomingId },
      data: { paymentId, status: 'ASIGNADO' },
    });
    if (payment.entryId) {
      await this.notifications.notifyPaymentReceived({
        userId: payment.userId,
        incomingId,
        tournamentId: payment.tournamentId,
        entryId: payment.entryId,
        amountCOP: incoming.amountCOP,
      });
    }
    return { assigned: true };
  }

  private async remember(
    mail: BankMail,
    amountCOP: number,
    status: string,
    bankReference: string | null,
    payerName: string | null = null,
    concept: string | null = null,
  ) {
    try {
      return await this.prisma.incomingTransfer.create({
        data: {
          externalId: mail.externalId,
          amountCOP,
          payerName,
          concept,
          bankReference,
          fromDomain: mail.fromDomain || 'desconocido',
          receivedAt: mail.receivedAt,
          authenticated: mail.authenticated,
          status,
        },
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }
}

function pesos(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
