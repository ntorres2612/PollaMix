
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
   * Puede ejecutarse varias veces sin duplicar puntos.
   */
  async scoreMatch(matchId: number) {
    // 1. Buscar el partido y sus pronósticos.
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

    // 2. Verificar que exista un marcador.
    if (
      match.homeScore === null ||
      match.awayScore === null
    ) {
      throw new BadRequestException(
        'El partido aún no tiene resultado.',
      );
    }

    // 3. Verificar que el partido haya terminado.
    if (!match.finished) {
      throw new BadRequestException(
        'El partido todavía no ha terminado.',
      );
    }

    // 4. Si no hay pronósticos, registrar la puntuación
    // y devolver igualmente el marcador oficial.
    if (match.predictions.length === 0) {
      await this.prisma.match.update({
        where: {
          id: match.id,
        },
        data: {
          scoredAt: new Date(),
        },
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
        message:
          'El partido no tiene pronósticos para calificar.',
      };
    }

    // 5. Calcular y actualizar los puntos.
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

    // 6. Registrar cuándo terminó la puntuación.
    await this.prisma.match.update({
      where: {
        id: match.id,
      },
      data: {
        scoredAt: new Date(),
      },
    });

    // 7. Devolver una respuesta consistente.
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