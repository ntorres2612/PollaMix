import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { calculatePrizeDistribution } from './prize-distribution';
import { validatePrizeClosure } from './prize-closure-validation';

@Injectable()
export class PrizeClosureService {
  constructor(private readonly prisma: PrismaService) {}

  async closeTournament(tournamentId: number) {
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
      throw new BadRequestException('Identificador inválido.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Bloquear el torneo para serializar futuros cierres.
        await tx.$queryRaw`
          SELECT id FROM "Tournament"
          WHERE id = ${tournamentId}
          FOR UPDATE
        `;

        const existing = await tx.tournamentPrizeClosure.findUnique({
          where: { tournamentId },
        });

        if (existing) {
          throw new BadRequestException(
            'Esta Polla ya tiene un cierre definitivo.',
          );
        }

        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          select: {
            id: true,
            currency: true,
            inscription: true,
            registrationEndsAt: true,
            endsAt: true,
            participants: {
              select: {
                id: true,
                userId: true,
                paid: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    predictions: {
                      where: { tournamentId },
                      select: {
                        points: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!tournament) {
          throw new NotFoundException('La Polla no existe.');
        }

        if (tournament.currency !== 'COP') {
          throw new BadRequestException(
            'El cierre solo admite pesos colombianos.',
          );
        }

        const now = new Date();

        if (now < tournament.registrationEndsAt) {
          throw new BadRequestException(
            'El período de inscripción no ha terminado.',
          );
        }

        const selected = await tx.tournamentMatch.findMany({
          where: { tournamentId },
          select: {
            matchId: true,
          },
          orderBy: { matchId: 'asc' },
        });

        const matchIds = selected.map((item) => item.matchId);

        // Los partidos compartidos deben quedar inmovilizados
        // durante la lectura y el cálculo de este cierre.
        if (matchIds.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM "Match"
            WHERE id IN (${Prisma.join(matchIds)})
            ORDER BY id
            FOR UPDATE
          `;
        }

        const matches = await tx.tournamentMatch.findMany({
          where: { tournamentId },
          select: {
            match: {
              select: {
                finished: true,
                scoredAt: true,
                homeScore: true,
                awayScore: true,
              },
            },
          },
        });

        const allPayments = await tx.payment.findMany({
          where: { tournamentId },
          select: {
            id: true,
            userId: true,
            participantId: true,
            amount: true,
            currency: true,
            status: true,
          },
        });

        if (allPayments.some((payment) => payment.status === 'PENDING')) {
          throw new BadRequestException(
            'Existen pagos pendientes de conciliación.',
          );
        }

        const approved = allPayments.filter(
          (payment) => payment.status === 'APPROVED',
        );

        const validation = validatePrizeClosure({
          tournamentEnded: now >= tournament.endsAt,
          inscriptionCOP: tournament.inscription,
          matches: matches.map((item) => item.match),
          payments: approved,
          participants: tournament.participants.map((participant) => ({
            id: participant.id,
            userId: participant.userId,
            paid: participant.paid,
          })),
        });

        if (!validation.ready) {
          throw new BadRequestException(validation.errors.join(' '));
        }

        const paidUserIds = new Set(
          approved.map((payment) => payment.userId),
        );

        const candidates = tournament.participants
          .filter((participant) => paidUserIds.has(participant.userId))
          .map((participant) => ({
            userId: participant.userId,
            name: participant.user.name,
            points: participant.user.predictions.reduce(
              (sum, prediction) => sum + prediction.points,
              0,
            ),
          }));

        const distribution = calculatePrizeDistribution(
          validation.revenueCOP,
          candidates.map(({ userId, points }) => ({
            userId,
            points,
          })),
        );

        const winners = distribution.winners.map((winner) => ({
          ...winner,
          name: candidates.find(
            (candidate) => candidate.userId === winner.userId,
          )?.name ?? '',
        }));

        // El esquema actual utiliza Int para importes.
        const amounts = [
          distribution.revenueCOP,
          distribution.prizePoolCOP,
          distribution.profitCOP,
          distribution.firstCOP,
          distribution.secondCOP,
          distribution.thirdCOP,
          distribution.allocatedCOP,
          distribution.undistributedCOP,
          ...winners.map((winner) => winner.amountCOP),
        ];

        if (amounts.some((value) =>
          !Number.isSafeInteger(value) ||
          value < 0 ||
          value > 2147483647
        )) {
          throw new BadRequestException(
            'El importe supera el límite del modelo de cierre.',
          );
        }

        return tx.tournamentPrizeClosure.create({
          data: {
            tournamentId,
            currency: 'COP',
            paidPlayers: validation.paidPlayers,
            revenueCOP: distribution.revenueCOP,
            prizePoolCOP: distribution.prizePoolCOP,
            profitCOP: distribution.profitCOP,
            firstCOP: distribution.firstCOP,
            secondCOP: distribution.secondCOP,
            thirdCOP: distribution.thirdCOP,
            winners: winners as Prisma.InputJsonValue,
            allocatedCOP: distribution.allocatedCOP,
            undistributedCOP: distribution.undistributedCOP,
            rulesVersion: '1.0',
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      },
    );
  }
}
