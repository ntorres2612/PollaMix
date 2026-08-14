import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

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
        match: true,
        tournament: true,
      },
      orderBy: {
        createdAt: 'desc',
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
        'No tienes permisos para consultar este pronóstico.',
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