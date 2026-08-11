import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TournamentParticipantsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async join(
    tournamentId: number,
    userId: number,
  ) {

    // 1. Verificar que el torneo exista
    const tournament =
      await this.prisma.tournament.findUnique({
        where: {
          id: tournamentId,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'Torneo no encontrado.',
      );
    }

    // 2. Verificar que el torneo esté abierto
    if (!tournament.active) {
      throw new BadRequestException(
        'El torneo no está activo.',
      );
    }

    // 3. Verificar fecha de inicio
    if (
      tournament.startsAt &&
      tournament.startsAt <= new Date()
    ) {
      throw new BadRequestException(
        'El torneo ya comenzó.',
      );
    }

    // 4. Verificar si el usuario ya está inscrito
    const existing =
      await this.prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId,
          },
        },
      });

    if (existing) {
      throw new BadRequestException(
        'El usuario ya está inscrito en este torneo.',
      );
    }

    // 5. Verificar límite de jugadores
    const participants =
      await this.prisma.tournamentParticipant.count({
        where: {
          tournamentId,
        },
      });

    if (
      participants >= tournament.maxPlayers
    ) {
      throw new BadRequestException(
        'El torneo ya alcanzó el máximo de jugadores.',
      );
    }

    // 6. Crear inscripción
    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId,
        paid: false,
      },
    });
  }

  async findParticipants(
    tournamentId: number,
  ) {

    return this.prisma.tournamentParticipant.findMany({
      where: {
        tournamentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }
}