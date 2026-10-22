
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TournamentParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async join(tournamentId: number, userId: number) {
    if (
      !Number.isSafeInteger(tournamentId) ||
      tournamentId <= 0 ||
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new BadRequestException(
        'Los datos de inscripción no son válidos.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Bloquea la fila del torneo durante la inscripción.
          // Esto permite controlar el cupo incluso cuando
          // llegan varias solicitudes simultáneas.
          const rows = await tx.$queryRaw<
            Array<{ id: number }>
          >`
            SELECT id
            FROM "Tournament"
            WHERE id = ${tournamentId}
            FOR UPDATE
          `;

          if (rows.length === 0) {
            throw new NotFoundException(
              'La Polla no existe.',
            );
          }

          const tournament =
            await tx.tournament.findUniqueOrThrow({
              where: {
                id: tournamentId,
              },
            });

          const now = new Date();

          if (!tournament.active) {
            throw new BadRequestException(
              'La Polla no está activa.',
            );
          }

          if (
            now < tournament.registrationStartsAt ||
            now >= tournament.registrationEndsAt
          ) {
            throw new BadRequestException(
              'Las inscripciones no están abiertas.',
            );
          }

          if (now >= tournament.startsAt) {
            throw new BadRequestException(
              'La Polla ya comenzó.',
            );
          }

          const user = await tx.user.findUnique({
            where: {
              id: userId,
            },
            select: {
              id: true,
            },
          });

          if (!user) {
            throw new NotFoundException(
              'El usuario no existe.',
            );
          }

          const existing =
            await tx.tournamentParticipant.findUnique({
              where: {
                tournamentId_userId: {
                  tournamentId,
                  userId,
                },
              },
            });

          if (existing) {
            throw new BadRequestException(
              'Ya estás inscrito en esta Polla.',
            );
          }

          const participantsCount =
            await tx.tournamentParticipant.count({
              where: {
                tournamentId,
              },
            });

          if (
            tournament.maxPlayers > 0 &&
            participantsCount >= tournament.maxPlayers
          ) {
            throw new BadRequestException(
              'La Polla alcanzó el máximo de participantes.',
            );
          }

          // Todos los torneos que utilicen este flujo
          // deben tener importes en centavos USD.
          if (
            !Number.isSafeInteger(tournament.inscription) ||
            tournament.inscription <= 0
          ) {
            throw new BadRequestException(
              'El valor de inscripción no es válido.',
            );
          }

          const participant =
            await tx.tournamentParticipant.create({
              data: {
                tournamentId,
                userId,
                paid: false,
              },
              select: {
                id: true,
                tournamentId: true,
                userId: true,
                joinedAt: true,
                paid: true,
              },
            });

          const payment = await tx.payment.create({
            data: {
              tournamentId,
              userId,
              participantId: participant.id,
              amount: tournament.inscription,
              status: 'PENDING',
              reference:
                `PNT-${tournamentId}-${userId}-${randomUUID()}`,
            },
            select: {
              id: true,
              amount: true,
              reference: true,
              status: true,
            },
          });

          return {
            participant,
            payment: {
              ...payment,
              currency: 'USD',
              amountUsd: payment.amount / 100,
            },
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 10000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Ya estás inscrito en esta Polla.',
        );
      }

      throw error;
    }
  }

  async findParticipants(tournamentId: number) {
    const tournament =
      await this.prisma.tournament.findUnique({
        where: {
          id: tournamentId,
        },
        select: {
          id: true,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'La Polla no existe.',
      );
    }

    return this.prisma.tournamentParticipant.findMany({
      where: {
        tournamentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }
}
