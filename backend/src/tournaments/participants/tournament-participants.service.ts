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
        include: {
          participants: true,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'El torneo no existe.',
      );
    }

    // 2. Verificar que el torneo esté activo
    if (!tournament.active) {
      throw new BadRequestException(
        'El torneo no está activo.',
      );
    }

    const now = new Date();

    // 3. Verificar que la inscripción ya haya comenzado
    if (now < tournament.registrationStartsAt) {
      throw new BadRequestException(
        'La inscripción todavía no está abierta.',
      );
    }

    // 4. Verificar que la inscripción no haya terminado
    if (now > tournament.registrationEndsAt) {
      throw new BadRequestException(
        'El período de inscripción ya terminó.',
      );
    }

    // 5. Verificar que el torneo todavía no haya comenzado
    if (now >= tournament.startsAt) {
      throw new BadRequestException(
        'El torneo ya comenzó.',
      );
    }

    // 6. Verificar que el usuario exista
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'El usuario no existe.',
      );
    }

    // 7. Verificar si ya está inscrito
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

    // 8. Verificar límite de participantes
    if (
      tournament.participants.length >=
      tournament.maxPlayers
    ) {
      throw new BadRequestException(
        'El torneo ya alcanzó el máximo de participantes.',
      );
    }

    // 9. Crear inscripción
    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId,
        paid: tournament.inscription === 0,
      },
      include: {
        tournament: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findParticipants(
    tournamentId: number,
  ) {

    // Verificar que el torneo exista
    const tournament =
      await this.prisma.tournament.findUnique({
        where: {
          id: tournamentId,
        },
      });

    if (!tournament) {
      throw new NotFoundException(
        'El torneo no existe.',
      );
    }

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