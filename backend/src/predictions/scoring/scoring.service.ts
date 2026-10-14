import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { calculateScore } from '../../common/utils/score-calculator';

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula y actualiza los puntos de los pronósticos
   * asociados a un partido.
   *
   * Regla: 1 punto por acertar local, empate o visitante.
   */
  async scoreMatch(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { predictions: true },
    });

    if (!match) {
      throw new NotFoundException('Partido no encontrado.');
    }

    if (match.homeScore === null || match.awayScore === null) {
      throw new BadRequestException(
        'El partido aún no tiene resultado.',
      );
    }

    if (!match.finished) {
      throw new BadRequestException(
        'El partido todavía no ha terminado.',
      );
    }

    if (match.predictions.length === 0) {
      await this.prisma.match.update({
        where: { id: match.id },
        data: { scoredAt: new Date() },
      });

      return {
        success: true,
        matchId: match.id,
        predictions: 0,
        scored: 0,
        result: {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        },
        message: 'El partido no tiene pronósticos para calificar.',
      };
    }

    let scored = 0;

    for (const prediction of match.predictions) {
      const points = calculateScore(
        prediction.homeScore,
        prediction.awayScore,
        match.homeScore,
        match.awayScore,
      );

      await this.prisma.prediction.update({
        where: { id: prediction.id },
        data: { points },
      });

      scored++;
    }

    await this.prisma.match.update({
      where: { id: match.id },
      data: { scoredAt: new Date() },
    });

    return {
      success: true,
      matchId: match.id,
      predictions: match.predictions.length,
      scored,
      result: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    };
  }
}

