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

        if (participant.predictionsSubmittedAt) {
          throw new BadRequestException(
            'Ya confirmaste tus 10 pronósticos. No puedes modificarlos.',
          );
        }

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

        if (!participant.paid) {
          throw new ForbiddenException(
            'Tu inscripción todavía no tiene el pago aprobado.',
          );
        }

        const approvedPayment =
          await tx.payment.findFirst({
            where: {
              tournamentId,
              userId,
              participantId: participant.id,
              status: 'APPROVED',
            },
            select: { id: true },
          });

        if (!approvedPayment) {
          throw new ForbiddenException(
            'No se encontró un pago aprobado para esta inscripción.',
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

        const existingPredictions =
          await tx.prediction.count({
            where: {
              tournamentId,
              userId,
            },
          });

        if (existingPredictions > 0) {
          throw new BadRequestException(
            'Ya existen pronósticos registrados. No se permite un envío duplicado.',
          );
        }

        const result = await tx.prediction.createMany({
          data: dto.predictions.map((prediction) => ({
            tournamentId,
            userId,
            matchId: prediction.matchId,
            ...selections[prediction.selection],
          })),
        });

        if (result.count !== 10) {
          throw new BadRequestException(
            'No fue posible registrar los 10 pronósticos.',
          );
        }

        await tx.tournamentParticipant.update({
          where: { id: participant.id },
          data: {
            predictionsSubmittedAt: now,
          },
        });

        return {
          success: true,
          tournamentId,
          submitted: result.count,
          submittedAt: now,
          message:
            'Tus 10 pronósticos quedaron confirmados definitivamente.',
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
    // 1. Verificar partido
    const match = await this.prisma.match.findUnique({
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
      await this.prisma.tournament.findUnique({
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

    // 3. Verificar liga
    if (match.leagueId !== tournament.leagueId) {
      throw new BadRequestException(
        'El partido no pertenece a la liga del torneo.',
      );
    }

    // 4. Verificar temporada
    if (match.matchday.season !== tournament.season) {
      throw new BadRequestException(
        'El partido no pertenece a la temporada del torneo.',
      );
    }

    const selectedMatch =
      await this.prisma.tournamentMatch.findUnique({
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

    // 6. Verificar pago
    if (!participant.paid) {
      throw new BadRequestException(
        'El usuario no tiene el pago aprobado.',
      );
    }

    // 7. Torneo activo
    if (!tournament.active) {
      throw new BadRequestException(
        'El torneo no está activo.',
      );
    }

    // 8. Torneo iniciado
    if (new Date() < tournament.startsAt) {
      throw new BadRequestException(
        'El torneo todavía no ha comenzado.',
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
      await this.prisma.prediction.findUnique({
        where: {
          userId_matchId_tournamentId: {
            userId,
            matchId: dto.matchId,
            tournamentId: dto.tournamentId,
          },
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un pronóstico para este partido.',
      );
    }

    // 11. Crear
    return this.prisma.prediction.create({
      data: {
        userId,
        matchId: dto.matchId,
        tournamentId: dto.tournamentId,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
      },
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
    const prediction =
      await this.prisma.prediction.findUnique({
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

    return this.prisma.prediction.update({
      where: { id },
      data: dto,
    });
  }

  async remove(
    id: number,
    userId: number,
  ) {
    const prediction =
      await this.prisma.prediction.findUnique({
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

    return this.prisma.prediction.delete({
      where: { id },
    });
  }
}