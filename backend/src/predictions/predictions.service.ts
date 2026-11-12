import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { SubmitPredictionsDto } from './dto/submit-predictions.dto';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }


  async submit(
    userId: number,
    dto: SubmitPredictionsDto,
  ) {
    const tournamentId = dto.tournamentId;

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(tournamentId) ||
      tournamentId <= 0 ||
      !Array.isArray(dto.predictions) ||
      dto.predictions.length !== 10
    ) {
      throw new BadRequestException(
        'Debes enviar exactamente 10 pronósticos válidos.',
      );
    }

    const selections = {
      HOME: { homeScore: 1, awayScore: 0 },
      DRAW: { homeScore: 0, awayScore: 0 },
      AWAY: { homeScore: 0, awayScore: 1 },
    } as const;

    const matchIds = dto.predictions.map(
      (prediction) => prediction.matchId,
    );

    if (
      new Set(matchIds).size !== 10 ||
      matchIds.some(
        (id) => !Number.isSafeInteger(id) || id <= 0,
      ) ||
      dto.predictions.some(
        (prediction) =>
          !Object.prototype.hasOwnProperty.call(
            selections,
            prediction.selection,
          ),
      )
    ) {
      throw new BadRequestException(
        'Los 10 partidos deben ser únicos y tener una selección válida.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Coordina el envío con la selección de partidos.
        // Mantener siempre el orden: Tournament -> TournamentParticipant.
        await tx.$queryRaw`
          SELECT id FROM "Tournament"
          WHERE id = ${tournamentId}
          FOR UPDATE
        `;

        // El cierre definitivo impide nuevos pronósticos.
        // La comprobación comparte el bloqueo de Tournament.
        const prizeClosure =
          await tx.tournamentPrizeClosure.findUnique({
            where: { tournamentId },
            select: { id: true },
          });

        if (prizeClosure) {
          throw new ForbiddenException(
            'Los premios de esta Polla están cerrados. No se permiten nuevos pronósticos.',
          );
        }

        // POLLAMIX_PUBLISHED_PREDICTIONS_GUARD
        // Consultar bajo el bloqueo de Tournament.
        const publicationState = await tx.tournament.findUnique({
          where: { id: tournamentId },
          select: { resultsPublishedAt: true },
        });

        if (publicationState?.resultsPublishedAt != null) {
          throw new ForbiddenException(
            'Los resultados de esta Polla ya fueron publicados. Los pronósticos no pueden modificarse.',
          );
        }

        // Serializa los envíos del mismo participante.
        const rows = await tx.$queryRaw<
          Array<{ id: number }>
        >`
          SELECT id
          FROM "TournamentParticipant"
          WHERE "tournamentId" = ${tournamentId}
            AND "userId" = ${userId}
          FOR UPDATE
        `;

        if (rows.length === 0) {
          throw new ForbiddenException(
            'No estás inscrito en esta Polla.',
          );
        }

        const participant =
          await tx.tournamentParticipant.findUniqueOrThrow({
            where: {
              tournamentId_userId: {
                tournamentId,
                userId,
              },
            },
          });

        const tournament =
          await tx.tournament.findUnique({
            where: { id: tournamentId },
          });

        if (!tournament || !tournament.active) {
          throw new BadRequestException(
            'La Polla no está disponible.',
          );
        }

        const now = new Date();

        if (
          !tournament.predictionsCloseAt ||
          now >= tournament.predictionsCloseAt ||
          now >= tournament.endsAt
        ) {
          throw new BadRequestException(
            'El plazo para enviar pronósticos está cerrado.',
          );
        }

        const tournamentMatches =
          await tx.tournamentMatch.findMany({
            where: { tournamentId },
            select: {
              matchId: true,
              match: {
                select: {
                  date: true,
                  finished: true,
                },
              },
            },
          });

        if (
          tournamentMatches.length !== 10 ||
          tournamentMatches.some(
            (item) =>
              !matchIds.includes(item.matchId) ||
              item.match.finished ||
              item.match.date <= now,
          )
        ) {
          throw new BadRequestException(
            'Los partidos seleccionados no son válidos o alguno ya comenzó.',
          );
        }

        const entry = await tx.pollEntry.create({
          data: {
            tournamentId,
            userId,
            participantId: participant.id,
            paid: false,
          },
        });

        const result = await tx.prediction.createMany({
          data: dto.predictions.map((prediction) => ({
            tournamentId,
            userId,
            matchId: prediction.matchId,
            entryId: entry.id,
            ...selections[prediction.selection],
          })),
        });

        if (result.count !== 10) {
          throw new BadRequestException(
            'No fue posible registrar los 10 pronósticos.',
          );
        }

        return {
          success: true,
          pending: true,
          tournamentId,
          entryId: entry.id,
          submitted: result.count,
          submittedAt: null,
          message:
            'Tus pronósticos quedaron guardados en estado pendiente. Envía el comprobante de pago.',
        };
      },
      {
        timeout: 10000,
      },
    );
  }


  async create(
    userId: number,
    dto: CreatePredictionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "Tournament"
        WHERE id = ${dto.tournamentId}
        FOR UPDATE
      `;

      const closure = await tx.tournamentPrizeClosure.findUnique({
        where: { tournamentId: dto.tournamentId },
        select: { id: true },
      });

      if (closure) {
        throw new ForbiddenException(
          'Los premios de esta Polla están cerrados. No se permiten nuevos pronósticos.',
        );
      }


      // POLLAMIX_PUBLISHED_PREDICTIONS_GUARD
      // Consultar bajo el bloqueo de Tournament.
      const publicationState = await tx.tournament.findUnique({
        where: { id: dto.tournamentId },
        select: { resultsPublishedAt: true },
      });

      if (publicationState?.resultsPublishedAt != null) {
        throw new ForbiddenException(
          'Los resultados de esta Polla ya fueron publicados. Los pronósticos no pueden modificarse.',
        );
      }

    // 1. Verificar partido
    const match = await tx.match.findUnique({
      where: {
        id: dto.matchId,
      },
      include: {
        matchday: true,
      },
    });

    if (!match) {
      throw new NotFoundException(
        'Partido no encontrado',
      );
    }

    // 2. Verificar torneo
    const tournament =
      await tx.tournament.findUnique({
        where: {
          id: dto.tournamentId,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'Torneo no encontrado',
      );
    }

    if (tournament.predictionsCloseAt !== null) {
      throw new ForbiddenException(
        'Esta Polla requiere confirmar los 10 pronósticos juntos.',
      );
    }

    const selectedMatch =
      await tx.tournamentMatch.findUnique({
        where: {
          tournamentId_matchId: {
            tournamentId: dto.tournamentId,
            matchId: dto.matchId,
          },
        },
      });

    if (!selectedMatch) {
      throw new BadRequestException(
        'Este partido no está habilitado para esta Polla.',
      );
    }
    // 5. Verificar inscripción
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
        'El usuario no está inscrito en este torneo.',
      );
    }

    // 6. Verificar pago
    if (!participant.paid) {
      throw new BadRequestException(
        'Tu inscripción todavía no tiene el pago aprobado.',
      );
    }

    // 7. Torneo activo
    if (!tournament.active) {
      throw new BadRequestException(
        'El torneo no está activo.',
      );
    }

    // 8. Torneo no terminado
    if (
      tournament.endsAt &&
      tournament.endsAt <= new Date()
    ) {
      throw new BadRequestException(
        'El torneo ya terminó.',
      );
    }

    // 9. Partido futuro
    if (match.finished) {
      throw new BadRequestException(
        'El partido ya terminó.',
      );
    }

    if (match.date <= new Date()) {
      throw new BadRequestException(
        'El partido ya comenzó.',
      );
    }

    // 10. Evitar duplicado
    const existing =
      await tx.prediction.findFirst({
        where: {
          userId,
          matchId: dto.matchId,
          tournamentId: dto.tournamentId,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un pronóstico para este partido.',
      );
    }

    const entry = await tx.pollEntry.create({
      data: {
        tournamentId: dto.tournamentId,
        userId,
        participantId: participant.id,
        paid: false,
      },
    });

    return tx.prediction.create({
      data: {
        userId,
        matchId: dto.matchId,
        tournamentId: dto.tournamentId,
        entryId: entry.id,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
      },
    });
    });
  }

  async findAll(userId: number) {
    return this.prisma.prediction.findMany({
      where: {
        userId,
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            matchday: true,
          },
        },
        tournament: true,
      },
      orderBy: {
        match: {
          date: 'asc',
        },
      },
    });
  }

  async findOne(
    id: number,
    userId: number,
  ) {
    const prediction =
      await this.prisma.prediction.findUnique({
        where: { id },
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
              matchday: true,
            },
          },
          tournament: true,
        },
      });

    if (!prediction) {
      throw new NotFoundException(
        'Pronóstico no encontrado',
      );
    }

    if (prediction.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para consultar este pronóstico.',
      );
    }
    if (!prediction.tournament.active) {
      throw new BadRequestException(
        'El torneo no está activo.',
      );
    }

    if (prediction.tournament.endsAt <= new Date()) {
      throw new BadRequestException(
        'El torneo ya terminó.',
      );
    }

    return prediction;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdatePredictionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const prediction =
        await tx.prediction.findUnique({
          where: { id },
          include: {
            match: true,
            tournament: true,
          },
        });

      if (!prediction) {
        throw new NotFoundException(
          'Pronóstico no encontrado',
        );
      }

      if (prediction.userId !== userId) {
        throw new ForbiddenException(
          'No tienes permisos para modificar este pronóstico.',
        );
      }

      // Comparte el bloqueo con el cierre definitivo de premios.
      await tx.$queryRaw`
        SELECT id FROM "Tournament"
        WHERE id = ${prediction.tournamentId}
        FOR UPDATE
      `;

      const closure = await tx.tournamentPrizeClosure.findUnique({
        where: { tournamentId: prediction.tournamentId },
        select: { id: true },
      });

      if (closure) {
        throw new ForbiddenException(
          'Los premios de esta Polla están cerrados. Los pronósticos son definitivos.',
        );
      }

      // POLLAMIX_PUBLISHED_PREDICTIONS_GUARD
      // Consultar bajo el bloqueo de Tournament.
      const publicationState = await tx.tournament.findUnique({
        where: { id: prediction.tournamentId },
        select: { resultsPublishedAt: true },
      });

      if (publicationState?.resultsPublishedAt != null) {
        throw new ForbiddenException(
          'Los resultados de esta Polla ya fueron publicados. Los pronósticos no pueden modificarse.',
        );
      }

      if (prediction.tournament.predictionsCloseAt !== null) {
        throw new ForbiddenException(
          'Los pronósticos de esta Polla son definitivos y no pueden modificarse.',
        );
      }

      if (prediction.match.date <= new Date()) {
        throw new BadRequestException(
          'El partido ya comenzó. El pronóstico no puede modificarse.',
        );
      }

      if (prediction.match.finished) {
        throw new BadRequestException(
          'El partido ya terminó. El pronóstico no puede modificarse.',
        );
      }

      return tx.prediction.update({
        where: { id },
        data: dto,
      });
    });
  }
  async remove(
    id: number,
    userId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const prediction =
        await tx.prediction.findUnique({
          where: { id },
          include: {
            match: true,
            tournament: true,
          },
        });

      if (!prediction) {
        throw new NotFoundException(
          'Pronóstico no encontrado',
        );
      }

      if (prediction.userId !== userId) {
        throw new ForbiddenException(
          'No tienes permisos para eliminar este pronóstico.',
        );
      }

      // Comparte el bloqueo con el cierre definitivo de premios.
      await tx.$queryRaw`
        SELECT id FROM "Tournament"
        WHERE id = ${prediction.tournamentId}
        FOR UPDATE
      `;

      const closure = await tx.tournamentPrizeClosure.findUnique({
        where: { tournamentId: prediction.tournamentId },
        select: { id: true },
      });

      if (closure) {
        throw new ForbiddenException(
          'Los premios de esta Polla están cerrados. Los pronósticos son definitivos.',
        );
      }

      // POLLAMIX_PUBLISHED_PREDICTIONS_GUARD
      // Consultar bajo el bloqueo de Tournament.
      const publicationState = await tx.tournament.findUnique({
        where: { id: prediction.tournamentId },
        select: { resultsPublishedAt: true },
      });

      if (publicationState?.resultsPublishedAt != null) {
        throw new ForbiddenException(
          'Los resultados de esta Polla ya fueron publicados. Los pronósticos no pueden modificarse.',
        );
      }

      if (prediction.tournament.predictionsCloseAt !== null) {
        throw new ForbiddenException(
          'Los pronósticos de esta Polla son definitivos y no pueden eliminarse.',
        );
      }

      if (!prediction.tournament.active) {
        throw new BadRequestException(
          'El torneo no está activo.',
        );
      }

      if (prediction.tournament.endsAt <= new Date()) {
        throw new BadRequestException(
          'El torneo ya terminó. El pronóstico no puede eliminarse.',
        );
      }

      if (prediction.match.finished) {
        throw new BadRequestException(
          'El partido ya terminó. El pronóstico no puede eliminarse.',
        );
      }

      if (prediction.match.date <= new Date()) {
        throw new BadRequestException(
          'El partido ya comenzó. El pronóstico no puede eliminarse.',
        );
      }

      return tx.prediction.delete({
        where: { id },
      });
    });
  }

}