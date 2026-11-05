
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

  // POLLAMIX_PLAYER_CLAIMS_48H
  async createClaim(
    tournamentId: number,
    userId: number,
    reasonInput: unknown,
  ) {
    if (
      !Number.isSafeInteger(tournamentId) ||
      tournamentId <= 0 ||
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new BadRequestException(
        'Los datos de la reclamación no son válidos.',
      );
    }

    if (typeof reasonInput !== 'string') {
      throw new BadRequestException(
        'Debes describir el motivo de la reclamación.',
      );
    }

    const reason = reasonInput.trim();

    if (reason.length < 20 || reason.length > 2000) {
      throw new BadRequestException(
        'La descripción debe tener entre 20 y 2000 caracteres.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Mismo bloqueo de torneo utilizado por el cierre.
        // Serializa las reclamaciones del mismo torneo.
        const rows = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id
          FROM "Tournament"
          WHERE id = ${tournamentId}
          FOR UPDATE
        `;

        if (rows.length === 0) {
          throw new NotFoundException('La Polla no existe.');
        }

        const tournament = await tx.tournament.findUniqueOrThrow({
          where: { id: tournamentId },
          select: { resultsPublishedAt: true, resultsRevisedAt: true },
        });

        const closure = await tx.tournamentPrizeClosure.findUnique({
          where: { tournamentId },
          select: { id: true },
        });

        if (closure) {
          throw new BadRequestException(
            'La Polla ya tiene un cierre definitivo.',
          );
        }

        const publishedAt = tournament.resultsPublishedAt;

        if (!publishedAt) {
          throw new BadRequestException(
            'Los resultados todavía no han sido publicados.',
          );
        }

        const now = new Date();
        // POLLAMIX_REVISED_CLAIMS_DEADLINE_PLAYER
        const revisedAt = tournament.resultsRevisedAt;

        const effectivePublication =
          revisedAt && revisedAt.getTime() > publishedAt.getTime()
            ? revisedAt
            : publishedAt;

        const start = effectivePublication.getTime();
        const deadline = start + 48 * 60 * 60 * 1000;

        if (
          !Number.isFinite(start) ||
          now.getTime() < start
        ) {
          throw new BadRequestException(
            'La fecha de publicación no es válida.',
          );
        }

        if (now.getTime() >= deadline) {
          throw new BadRequestException(
            'El período de reclamaciones ya terminó.',
          );
        }

        const participant = await tx.tournamentParticipant.findUnique({
          where: {
            tournamentId_userId: {
              tournamentId,
              userId,
            },
          },
          select: { id: true },
        });

        if (!participant) {
          throw new BadRequestException(
            'Debes estar inscrito en esta Polla.',
          );
        }

        // Comprobación en la base de datos:
        // no se confía en el indicador paid del navegador.
        const approvedPayment = await tx.payment.findFirst({
          where: {
            tournamentId,
            userId,
            status: 'APPROVED',
            currency: 'COP',
            OR: [
              { participantId: participant.id },
              { participantId: null },
            ],
          },
          select: { id: true },
        });

        if (!approvedPayment) {
          throw new BadRequestException(
            'Se requiere un pago aprobado para reclamar.',
          );
        }

        const existingPending = await tx.tournamentClaim.findFirst({
          where: {
            tournamentId,
            userId,
            status: 'PENDING',
          },
          select: { id: true },
        });

        if (existingPending) {
          throw new BadRequestException(
            'Ya tienes una reclamación pendiente en esta Polla.',
          );
        }

        const claim = await tx.tournamentClaim.create({
          data: {
            tournamentId,
            userId,
            reason,
            status: 'PENDING',
          },
          select: {
            id: true,
            tournamentId: true,
            reason: true,
            status: true,
            createdAt: true,
          },
        });

        return {
          ...claim,
          claimsDeadlineAt: new Date(deadline),
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );
  }

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

          // Este flujo recibe importes enteros en COP.
          if (
            tournament.currency !== 'COP' ||
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
              currency: 'COP',
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
              currency: 'COP',
              amountCOP: payment.amount,
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
