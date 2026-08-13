import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Crear un pago para la inscripción a un torneo.
   */
  async create(
    userId: number,
    dto: CreatePaymentDto,
  ) {

    // 1. Verificar torneo
    const tournament =
      await this.prisma.tournament.findUnique({
        where: {
          id: dto.tournamentId,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'El torneo no existe.',
      );
    }

    // 2. Verificar que esté activo
    if (!tournament.active) {
      throw new BadRequestException(
        'El torneo no está activo.',
      );
    }

    // 3. Verificar que la inscripción tenga costo
    if (tournament.inscription <= 0) {
      throw new BadRequestException(
        'Este torneo no requiere pago de inscripción.',
      );
    }

    // 4. Validar monto
    if (dto.amount !== tournament.inscription) {
      throw new BadRequestException(
        `El valor de la inscripción es ${tournament.inscription}.`,
      );
    }

    // 5. Verificar participante
    const participant =
      await this.prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId: dto.tournamentId,
            userId,
          },
        },
      });

    if (!participant) {
      throw new BadRequestException(
        'El usuario no está inscrito en este torneo.',
      );
    }

    // 6. Verificar si ya existe un pago pendiente o aprobado
    const existingPayment =
      await this.prisma.payment.findFirst({
        where: {
          tournamentId: dto.tournamentId,
          userId,
          status: {
            in: [
              'PENDING',
              'APPROVED',
            ],
          },
        },
      });

    if (existingPayment) {
      throw new BadRequestException(
        'Ya existe un pago pendiente o aprobado para este torneo.',
      );
    }

    // 7. Crear pago
    return this.prisma.payment.create({
      data: {
        amount: dto.amount,
        reference: dto.reference,
        status: 'PENDING',
        method: dto.method,

        userId,

        tournamentId: dto.tournamentId,

        participantId: participant.id,
      },

      include: {
        tournament: true,

        participant: true,

      },
    });
  }

  /**
   * Consultar pagos del usuario autenticado.
   */
  async findMyPayments(
    userId: number,
  ) {

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

  /**
   * Consultar un pago.
   */
  async findOne(
    id: number,
    userId: number,
  ) {

    const payment =
      await this.prisma.payment.findFirst({

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

  /**
   * Actualizar estado del pago.
   *
   * Esta operación posteriormente deberá
   * quedar restringida a ADMIN.
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

    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'El pago no existe.',
      );
    }

    const paidAt =
      dto.status === 'APPROVED'
        ? new Date()
        : null;

    const updated =
      await this.prisma.payment.update({

        where: {
          id,
        },

        data: {
          status: dto.status,
          paidAt,
        },

      });

    // Si el pago fue aprobado,
    // confirmar la inscripción.
    if (
      dto.status === 'APPROVED' &&
      payment.participantId
    ) {

      await this.prisma.tournamentParticipant.update({

        where: {
          id: payment.participantId,
        },

        data: {
          paid: true,
        },

      });

    }

    return updated;
  }
}