import { calculateScore } from '../../common/utils/score-calculator';
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

  // POLLAMIX_PUBLISH_RESULTS_48H
  async publishResults(tournamentId: number) {
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
      throw new BadRequestException(
        'Identificador de Polla inválido.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Mismo orden principal de bloqueo que el cierre:
        // primero Tournament y después Match por ID.
        await tx.$queryRaw`
          SELECT id FROM "Tournament"
          WHERE id = ${tournamentId}
          FOR UPDATE
        `;

        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          select: {
            id: true,
            resultsPublishedAt: true,
          },
        });

        if (!tournament) {
          throw new NotFoundException('La Polla no existe.');
        }

        if (tournament.resultsPublishedAt !== null) {
          throw new BadRequestException(
            'Los resultados ya fueron publicados.',
          );
        }

        const closure = await tx.tournamentPrizeClosure.findUnique({
          where: { tournamentId },
          select: { id: true },
        });

        if (closure) {
          throw new BadRequestException(
            'La Polla ya tiene un cierre definitivo.',
          );
        }

        const selected = await tx.tournamentMatch.findMany({
          where: { tournamentId },
          select: { matchId: true },
          orderBy: { matchId: 'asc' },
        });

        if (selected.length !== 10) {
          throw new BadRequestException(
            'Se requieren exactamente 10 partidos seleccionados.',
          );
        }

        const matchIds = selected.map((item) => item.matchId);

        await tx.$queryRaw`
          SELECT id FROM "Match"
          WHERE id IN (${Prisma.join(matchIds)})
          ORDER BY id
          FOR UPDATE
        `;

        const selectedNow = await tx.tournamentMatch.findMany({
          where: { tournamentId },
          select: {
            matchId: true,
            match: {
              select: {
                finished: true,
                scoredAt: true,
                homeScore: true,
                awayScore: true,
              },
            },
          },
          orderBy: { matchId: 'asc' },
        });

        if (
          selectedNow.length !== 10 ||
          selectedNow.some(
            (item, index) => item.matchId !== matchIds[index],
          )
        ) {
          throw new BadRequestException(
            'Cambió la selección de partidos. Reintenta.',
          );
        }

        const valid = selectedNow.every(({ match }) =>
          match.finished === true &&
          match.scoredAt !== null &&
          Number.isSafeInteger(match.homeScore) &&
          Number.isSafeInteger(match.awayScore) &&
          (match.homeScore ?? -1) >= 0 &&
          (match.awayScore ?? -1) >= 0
        );

        if (!valid) {
          throw new BadRequestException(
            'Hay partidos sin resultado válido o sin puntuar.',
          );
        }

        // La publicación es única y no se reinicia.
        const publishedAt = new Date();

        const saved = await tx.tournament.updateMany({
          where: {
            id: tournamentId,
            resultsPublishedAt: null,
          },
          data: {
            resultsPublishedAt: publishedAt,
          },
        });

        if (saved.count !== 1) {
          throw new BadRequestException(
            'No se pudo registrar la publicación.',
          );
        }

        return {
          tournamentId,
          resultsPublishedAt: publishedAt,
          claimsDeadlineAt: new Date(
            publishedAt.getTime() + 48 * 60 * 60 * 1000,
          ),
          status: 'CLAIMS_OPEN',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      },
    );
  }

  // POLLAMIX_ADMIN_CLAIMS_MANAGEMENT

  async listClaims(tournamentId: number) {
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
      throw new BadRequestException(
        'Identificador de Polla inválido.',
      );
    }

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        resultsPublishedAt: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException('La Polla no existe.');
    }

    const claims = await this.prisma.tournamentClaim.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    return {
      tournament,
      claims,
      total: claims.length,
    };
  }

  async decideClaim(
    tournamentId: number,
    claimId: number,
    statusInput: unknown,
    decisionInput: unknown,
  ) {
    if (
      !Number.isSafeInteger(tournamentId) ||
      tournamentId <= 0 ||
      !Number.isSafeInteger(claimId) ||
      claimId <= 0
    ) {
      throw new BadRequestException(
        'Los identificadores no son válidos.',
      );
    }

    if (
      statusInput !== 'ACCEPTED' &&
      statusInput !== 'REJECTED'
    ) {
      throw new BadRequestException(
        'La decisión debe ser ACCEPTED o REJECTED.',
      );
    }

    if (typeof decisionInput !== 'string') {
      throw new BadRequestException(
        'Debes justificar la decisión.',
      );
    }

    const decision = decisionInput.trim();

    if (decision.length < 20 || decision.length > 2000) {
      throw new BadRequestException(
        'La justificación debe tener entre 20 y 2000 caracteres.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Orden de bloqueo compartido con publicación,
        // registro de reclamaciones y cierre de premios.
        const tournamentRows = await tx.$queryRaw<
          Array<{ id: number }>
        >`
          SELECT id FROM "Tournament"
          WHERE id = ${tournamentId}
          FOR UPDATE
        `;

        if (tournamentRows.length !== 1) {
          throw new NotFoundException('La Polla no existe.');
        }

        const tournament = await tx.tournament.findUniqueOrThrow({
          where: { id: tournamentId },
          select: { resultsPublishedAt: true },
        });

        if (!tournament.resultsPublishedAt) {
          throw new BadRequestException(
            'Los resultados todavía no están publicados.',
          );
        }

        const closure = await tx.tournamentPrizeClosure.findUnique({
          where: { tournamentId },
          select: { id: true },
        });

        if (closure) {
          throw new BadRequestException(
            'No pueden modificarse reclamaciones de una Polla cerrada.',
          );
        }

        const claimRows = await tx.$queryRaw<
          Array<{ id: number }>
        >`
          SELECT id FROM "TournamentClaim"
          WHERE id = ${claimId}
            AND "tournamentId" = ${tournamentId}
          FOR UPDATE
        `;

        if (claimRows.length !== 1) {
          throw new NotFoundException(
            'La reclamación no existe en esta Polla.',
          );
        }

        const claim = await tx.tournamentClaim.findUniqueOrThrow({
          where: { id: claimId },
          select: { status: true },
        });

        if (claim.status !== 'PENDING') {
          throw new BadRequestException(
            'La reclamación ya tiene una decisión.',
          );
        }

        const updated = await tx.tournamentClaim.update({
          where: { id: claimId },
          data: {
            status: statusInput,
            decision,

            // Una aceptación requiere aplicar y verificar
            // la corrección antes de considerarse resuelta.
            resolvedAt:
              statusInput === 'REJECTED'
                ? new Date()
                : null,
          },
          select: {
            id: true,
            tournamentId: true,
            status: true,
            decision: true,
            createdAt: true,
            resolvedAt: true,
          },
        });

        return {
          ...updated,
          correctionPending:
            updated.status === 'ACCEPTED',
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );
  }

  // POLLAMIX_OFFICIAL_CLAIM_CORRECTION
  async applyClaimCorrection(
    tournamentId: number,
    claimId: number,
    adminId: number,
    matchId: number,
    homeScore: number,
    awayScore: number,
    reasonInput: unknown,
    verifiedInput: unknown,
  ) {
    const identifiers = [
      tournamentId,
      claimId,
      adminId,
      matchId,
    ];

    if (
      identifiers.some(
        (value) =>
          !Number.isSafeInteger(value) || value <= 0,
      )
    ) {
      throw new BadRequestException(
        'Los identificadores no son válidos.',
      );
    }

    if (
      !Number.isSafeInteger(homeScore) ||
      !Number.isSafeInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      throw new BadRequestException(
        'El marcador corregido no es válido.',
      );
    }

    if (
      typeof reasonInput !== 'string' ||
      reasonInput.trim().length < 20 ||
      reasonInput.trim().length > 2000
    ) {
      throw new BadRequestException(
        'La justificación debe tener entre 20 y 2000 caracteres.',
      );
    }

    if (verifiedInput !== true) {
      throw new BadRequestException(
        'El administrador debe confirmar la verificación del resultado oficial de los 90 minutos.',
      );
    }

    const reason = reasonInput.trim();

    return this.prisma.$transaction(
      async (tx) => {
        const getTournamentIds = async () => {
          const relations = await tx.tournamentMatch.findMany({
            where: { matchId },
            select: { tournamentId: true },
            orderBy: { tournamentId: 'asc' },
          });

          return [
            ...new Set(
              relations.map((item) => item.tournamentId),
            ),
          ].sort((a, b) => a - b);
        };

        const tournamentIds = await getTournamentIds();

        if (!tournamentIds.includes(tournamentId)) {
          throw new BadRequestException(
            'El partido no pertenece a esta Polla.',
          );
        }

        // Orden compartido con la protección de partidos:
        // primero todos los torneos, después el partido.
        const lockedTournaments = await tx.$queryRaw<
          Array<{ id: number }>
        >`
          SELECT id FROM "Tournament"
          WHERE id IN (${Prisma.join(tournamentIds)})
          ORDER BY id
          FOR UPDATE
        `;

        if (lockedTournaments.length !== tournamentIds.length) {
          throw new BadRequestException(
            'Cambió la relación de torneos. Reintenta.',
          );
        }

        const lockedMatches = await tx.$queryRaw<
          Array<{ id: number }>
        >`
          SELECT id FROM "Match"
          WHERE id = ${matchId}
          FOR UPDATE
        `;

        if (lockedMatches.length !== 1) {
          throw new NotFoundException(
            'El partido no existe.',
          );
        }

        const currentTournamentIds = await getTournamentIds();

        if (
          currentTournamentIds.length !== tournamentIds.length ||
          tournamentIds.some(
            (id, index) =>
              id !== currentTournamentIds[index],
          )
        ) {
          throw new BadRequestException(
            'Cambió la selección del partido. Reintenta.',
          );
        }

        const tournaments = await tx.tournament.findMany({
          where: {
            id: { in: tournamentIds },
          },
          select: {
            id: true,
            resultsPublishedAt: true,
          },
        });

        const closures = await tx.tournamentPrizeClosure.findMany({
          where: {
            tournamentId: { in: tournamentIds },
          },
          select: { tournamentId: true },
        });

        if (closures.length > 0) {
          throw new BadRequestException(
            'No puede corregirse un partido asociado a premios definitivamente cerrados.',
          );
        }

        const target = tournaments.find(
          (item) => item.id === tournamentId,
        );

        if (!target?.resultsPublishedAt) {
          throw new BadRequestException(
            'La clasificación de esta Polla todavía no está publicada.',
          );
        }

        const otherPublished = tournaments.some(
          (item) =>
            item.id !== tournamentId &&
            item.resultsPublishedAt !== null,
        );

        if (otherPublished) {
          throw new BadRequestException(
            'El partido pertenece a otra Polla con resultados publicados. Se requiere un procedimiento de corrección coordinado.',
          );
        }

        const claim = await tx.tournamentClaim.findFirst({
          where: {
            id: claimId,
            tournamentId,
          },
          select: {
            id: true,
            status: true,
            resolvedAt: true,
            resultCorrection: {
              select: { id: true },
            },
          },
        });

        if (!claim) {
          throw new NotFoundException(
            'La reclamación no existe en esta Polla.',
          );
        }

        if (
          claim.status !== 'ACCEPTED' ||
          claim.resolvedAt !== null ||
          claim.resultCorrection !== null
        ) {
          throw new BadRequestException(
            'La reclamación no está aceptada y pendiente de corrección.',
          );
        }

        const match = await tx.match.findUnique({
          where: { id: matchId },
          select: {
            homeScore: true,
            awayScore: true,
            finished: true,
            scoredAt: true,
          },
        });

        if (
          !match ||
          !match.finished ||
          match.scoredAt === null ||
          !Number.isSafeInteger(match.homeScore) ||
          !Number.isSafeInteger(match.awayScore)
        ) {
          throw new BadRequestException(
            'El partido no tiene un resultado final previamente puntuado.',
          );
        }

        if (
          match.homeScore === homeScore &&
          match.awayScore === awayScore
        ) {
          throw new BadRequestException(
            'El marcador corregido es igual al registrado.',
          );
        }

        const appliedAt = new Date();

        // La corrección se aplica a un único Match.
        await tx.match.update({
          where: { id: matchId },
          data: {
            homeScore,
            awayScore,
            finished: true,
            scoredAt: appliedAt,
          },
        });

        // Recalcular todos los pronósticos del partido,
        // incluso si pertenece a Pollas aún no publicadas.
        const predictions = await tx.prediction.findMany({
          where: { matchId },
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
          },
        });

        for (const prediction of predictions) {
          await tx.prediction.update({
            where: { id: prediction.id },
            data: {
              points: calculateScore(
                prediction.homeScore,
                prediction.awayScore,
                homeScore,
                awayScore,
              ),
            },
          });
        }

        const correction =
          await tx.tournamentResultCorrection.create({
            data: {
              claimId,
              matchId,
              adminId,
              oldHomeScore: match.homeScore!,
              oldAwayScore: match.awayScore!,
              newHomeScore: homeScore,
              newAwayScore: awayScore,
              reason,
              appliedAt,
            },
            select: {
              id: true,
              claimId: true,
              matchId: true,
              oldHomeScore: true,
              oldAwayScore: true,
              newHomeScore: true,
              newAwayScore: true,
              appliedAt: true,
            },
          });

        await tx.tournamentClaim.update({
          where: { id: claimId },
          data: {
            resolvedAt: appliedAt,
          },
        });

        await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            resultsRevisedAt: appliedAt,
          },
        });

        return {
          tournamentId,
          correction,
          predictionsRecalculated: predictions.length,
          resultsRevisedAt: appliedAt,
          claimsDeadlineAt: new Date(
            appliedAt.getTime() + 48 * 60 * 60 * 1000,
          ),
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
  }

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
            resultsPublishedAt: true,
            resultsRevisedAt: true,
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

        // POLLAMIX_CLAIMS_48H_CLOSURE_GUARD
        // Solo aplica a torneos todavía no cerrados.
        // Los cierres históricos ya fueron comprobados arriba.
        const publishedAt = tournament.resultsPublishedAt;

        if (!publishedAt) {
          throw new BadRequestException(
            'Los resultados oficiales aún no han sido publicados.',
          );
        }

        // POLLAMIX_REVISED_CLAIMS_DEADLINE_CLOSURE
        const revisedAt = tournament.resultsRevisedAt;

        const effectivePublication =
          revisedAt && revisedAt.getTime() > publishedAt.getTime()
            ? revisedAt
            : publishedAt;

        const publicationTime = effectivePublication.getTime();
        const currentTime = now.getTime();

        if (
          !Number.isFinite(publicationTime) ||
          publicationTime > currentTime
        ) {
          throw new BadRequestException(
            'La fecha de publicación de resultados no es válida.',
          );
        }

        const claimsDeadline =
          publicationTime + 48 * 60 * 60 * 1000;

        if (currentTime < claimsDeadline) {
          throw new BadRequestException(
            'El período de reclamaciones de 48 horas aún está abierto.',
          );
        }

        const unresolvedClaims = await tx.tournamentClaim.count({
          where: {
            tournamentId,
            OR: [
              { status: 'PENDING' },
              {
                status: 'ACCEPTED',
                resolvedAt: null,
              },
            ],
          },
        });

        if (unresolvedClaims > 0) {
          throw new BadRequestException(
            'Existen reclamaciones pendientes de resolución.',
          );
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
