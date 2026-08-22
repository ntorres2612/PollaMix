import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { calculateScore } from '../../common/utils/score-calculator';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Calcula y actualiza los puntos de todos los
   * pronósticos asociados a un partido.
   *
   * Este método puede ejecutarse varias veces sobre
   * el mismo partido sin generar puntos duplicados.
   */
  async scoreMatch(matchId: number) {
    // --------------------------------------------------
    // 1. Buscar partido
    // --------------------------------------------------

    const match = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
      include: {
        predictions: true,
      },
    });

    if (!match) {
      throw new NotFoundException(
        'Partido no encontrado.',
      );
    }

    // --------------------------------------------------
    // 2. Verificar resultado
    // --------------------------------------------------

    if (
      match.homeScore === null ||
      match.awayScore === null
    ) {
      throw new BadRequestException(
        'El partido aún no tiene resultado.',
      );
    }

    // --------------------------------------------------
    // 3. Verificar que el partido haya terminado
    // --------------------------------------------------

    if (!match.finished) {
      throw new BadRequestException(
        'El partido todavía no ha terminado.',
      );
    }

    // --------------------------------------------------
    // 4. Si no existen pronósticos
    // --------------------------------------------------

    if (match.predictions.length === 0) {
      return {
        success: true,
        matchId: match.id,
        predictions: 0,
        scored: 0,
        message:
          'El partido no tiene pronósticos para calificar.',
      };
    }

    // --------------------------------------------------
    // 5. Calcular y actualizar puntos
    // --------------------------------------------------

    let scored = 0;

    for (const prediction of match.predictions) {
      const points = calculateScore(
        prediction.homeScore,
        prediction.awayScore,
        match.homeScore,
        match.awayScore,
      );

      await this.prisma.prediction.update({
        where: {
          id: prediction.id,
        },
        data: {
          points,
        },
      });

      scored++;
    }

    // --------------------------------------------------
    // 6. Resultado
    // --------------------------------------------------

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