
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: number, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: {
          id: dto.tournamentId,
        },
      });

      if (!tournament) {
        throw new NotFoundException(
          'La Polla no existe.',
        );
      }

      const now = new Date();

      if (
        !tournament.active ||
        now < tournament.registrationStartsAt ||
        now >= tournament.registrationEndsAt
      ) {
        throw new BadRequestException(
          'Las inscripciones no están abiertas.',
        );
      }

      if (
        !Number.isSafeInteger(tournament.inscription) ||
        tournament.inscription <= 0
      ) {
        throw new BadRequestException(
          'El valor de inscripción no está configurado correctamente.',
        );
      }

      const participant =
        await tx.tournamentParticipant.findUnique({
          where: {
            tournamentId_userId: {
              tournamentId: dto.tournamentId,
              userId,
            },
          },
        });

      if (!participant) {
        throw new BadRequestException(
          'Primero debes inscribirte en la Polla.',
        );
      }

      const existingPayment = await tx.payment.findFirst({
        where: {
          tournamentId: dto.tournamentId,
          userId,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (existingPayment) {
        // Una segunda solicitud no debe crear otro pago.
        return existingPayment;
      }

      if (participant.paid) {
        throw new BadRequestException(
          'Esta participación ya está marcada como pagada.',
        );
      }

      return tx.payment.create({
        data: {
          amount: tournament.inscription,
          reference: `PNT-${dto.tournamentId}-${userId}-${randomUUID()}`,
          status: 'PENDING',
          method: null,
          userId,
          tournamentId: dto.tournamentId,
          participantId: participant.id,
        },
        include: {
          tournament: true,
          participant: true,
        },
      });
    });
  }

  async findMyPayments(userId: number) {
    return this.prisma.payment.findMany({
      where: {
        userId,
      },
      include: {
        tournament: true,
        participant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByTournament(tournamentId: number) {
    const tournament =
      await this.prisma.tournament.findUnique({
        where: {
          id: tournamentId,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'La Polla no existe.',
      );
    }

    return this.prisma.payment.findMany({
      where: {
        tournamentId,
      },
      include: {
        participant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async findOne(id: number, userId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        tournament: true,
        participant: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'El pago no existe.',
      );
    }

    return payment;
  }

  /*
   * Aprobación manual exclusiva del administrador.
   * Se conservará para pruebas controladas.
   *
   * Una pasarela real necesitará una confirmación
   * autenticada desde su servidor.
   */
  async updateStatus(
    id: number,
    dto: UpdatePaymentStatusDto,
  ) {
    const validStatuses = [
      'PENDING',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(
        'Estado de pago no válido.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new NotFoundException(
          'El pago no existe.',
        );
      }

      if (payment.status === 'APPROVED') {
        if (dto.status === 'APPROVED') {
          return payment;
        }

        throw new BadRequestException(
          'Un pago aprobado no puede cambiar de estado desde esta operación.',
        );
      }

      if (
        payment.status === 'REJECTED' ||
        payment.status === 'CANCELLED'
      ) {
        throw new BadRequestException(
          'Este pago ya tiene un estado final.',
        );
      }

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: dto.status,
          paidAt:
            dto.status === 'APPROVED'
              ? new Date()
              : null,
        },
      });

      if (payment.participantId) {
        await tx.tournamentParticipant.update({
          where: {
            id: payment.participantId,
          },
          data: {
            paid: dto.status === 'APPROVED',
          },
        });
      }

      return updated;
    });
  }
}
