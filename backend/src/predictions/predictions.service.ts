import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) { }

async create(
  userId: number,
  dto: CreatePredictionDto,
) {

  // 1. Verificar que el partido exista
  const match = await this.prisma.match.findUnique({
    where: {
      id: dto.matchId,
    },
  });

  if (!match) {
    throw new NotFoundException(
      'Partido no encontrado',
    );
  }

  // 2. Verificar que el torneo exista
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

  // 3. Verificar que el usuario esté inscrito
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

  // 4. Verificar que el torneo esté activo
  if (!tournament.active) {
    throw new BadRequestException(
      'El torneo no está activo.',
    );
  }

  // 5. Verificar que el torneo no haya terminado
  if (
    tournament.endsAt &&
    tournament.endsAt < new Date()
  ) {
    throw new BadRequestException(
      'El torneo ya terminó.',
    );
  }

  // 6. Verificar que el partido todavía no haya comenzado
  if (match.date <= new Date()) {
    throw new BadRequestException(
      'El partido ya comenzó',
    );
  }

  // 7. Verificar pronóstico duplicado
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

  // 8. Crear pronóstico
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

  findAll() {
    return this.prisma.prediction.findMany({
      include: {
        user: true,
        match: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.prediction.findUnique({
      where: { id },
      include: {
        user: true,
        match: true,
      },
    });
  }

  update(id: number, dto: UpdatePredictionDto) {
    return this.prisma.prediction.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.prediction.delete({
      where: { id },
    });
  }
}