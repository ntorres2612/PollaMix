import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateScore } from '../../common/utils/score-calculator';

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async scoreMatch(matchId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        // Impide puntuaciones simultáneas del mismo partido.
        await tx.$queryRaw`
          SELECT id FROM "Match"
          WHERE id = ${matchId}
          FOR UPDATE
        `;

        return this.scoreMatchInTransaction(tx, matchId);
      },
      { timeout: 20000 },
    );
  }

  /**
   * Calcula puntos dentro de una transacción existente.
   * El llamador debe haber bloqueado el partido mediante
   * FOR UPDATE o una actualización del mismo registro.
   */
  async scoreMatchInTransaction(
    tx: Prisma.TransactionClient,
    matchId: number,
  ) {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { predictions: true },
    });

    if (!match) {
      throw new NotFoundException('Partido no encontrado.');
    }

    if (!match.finished) {
      throw new BadRequestException(
        'El partido todavía no ha terminado.',
      );
    }

    if (match.homeScore === null || match.awayScore === null) {
      throw new BadRequestException(
        'El partido aún no tiene resultado.',
      );
    }

    for (const prediction of match.predictions) {
      const points = calculateScore(
        prediction.homeScore,
        prediction.awayScore,
        match.homeScore,
        match.awayScore,
      );

      await tx.prediction.update({
        where: { id: prediction.id },
        data: { points },
      });
    }

    await tx.match.update({
      where: { id: matchId },
      data: { scoredAt: new Date() },
    });

    return {
      success: true,
      matchId,
      predictions: match.predictions.length,
      scored: match.predictions.length,
      result: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    };
  }
}
