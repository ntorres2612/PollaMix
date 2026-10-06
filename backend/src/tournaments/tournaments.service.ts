import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import { CreateTournamentDto } from "./dto/create-tournament.dto";

import { UpdateTournamentDto } from "./dto/update-tournament.dto";

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CREAR TORNEO
  // ============================================================

  async create(dto: CreateTournamentDto) {
    const league = await this.prisma.league.findUnique({
      where: {
        id: dto.leagueId,
      },
    });

    if (!league) {
      throw new NotFoundException("La liga no existe.");
    }

    const registrationStartsAt = new Date(dto.registrationStartsAt);

    const registrationEndsAt = new Date(dto.registrationEndsAt);

    const startsAt = new Date(dto.startsAt);

    const endsAt = new Date(dto.endsAt);

    if (registrationEndsAt <= registrationStartsAt) {
      throw new BadRequestException(
        "La fecha de finalización de inscripción debe ser posterior a la fecha de inicio de inscripción.",
      );
    }

    if (startsAt <= registrationEndsAt) {
      throw new BadRequestException(
        "El torneo debe comenzar después de finalizar el período de inscripción.",
      );
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        "La fecha de finalización debe ser posterior a la fecha de inicio del torneo.",
      );
    }

    if (registrationEndsAt > startsAt) {
      throw new BadRequestException(
        "La inscripción debe terminar antes de que inicie el torneo.",
      );
    }

    if (dto.inscription < 0) {
      throw new BadRequestException(
        "El valor de inscripción no puede ser negativo.",
      );
    }

    if (dto.prize < 0) {
      throw new BadRequestException("El premio no puede ser negativo.");
    }

    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        description: dto.description,
        leagueId: dto.leagueId,
        season: dto.season,
        inscription: dto.inscription,
        prize: dto.prize,
        maxPlayers: dto.maxPlayers,
        registrationStartsAt,
        registrationEndsAt,
        startsAt,
        endsAt,
      },
      include: {
        league: true,
      },
    });
  }

  // ============================================================
  // TORNEO ACTUAL
  // ============================================================

  async getCurrent() {
    const now = new Date();

    const tournament = await this.prisma.tournament.findFirst({
      where: {
        active: true,
        registrationStartsAt: {
          lte: now,
        },
        endsAt: {
          gte: now,
        },
      },
      orderBy: {
        startsAt: "asc",
      },
    });

    return tournament;
  }

  // ============================================================
  // TORNEO ACTUAL DEL USUARIO
  // ============================================================

  async getCurrentForUser(userId: number) {
    const now = new Date();

    const participation = await this.prisma.tournamentParticipant.findFirst({
      where: {
        userId,
        tournament: {
          active: true,
          registrationStartsAt: {
            lte: now,
          },
          endsAt: {
            gte: now,
          },
        },
      },
      include: {
        tournament: true,
      },
      orderBy: {
        tournament: {
          startsAt: "asc",
        },
      },
    });

    return participation?.tournament ?? null;
  }

  // ============================================================
  // INSCRIBIR USUARIO
  // ============================================================

  async join(tournamentId: number, userId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
      include: {
        participants: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    if (!tournament.active) {
      throw new BadRequestException("La Polla no está activa.");
    }

    const now = new Date();

    if (now < tournament.registrationStartsAt) {
      throw new BadRequestException("La inscripción todavía no está abierta.");
    }

    if (now > tournament.registrationEndsAt) {
      throw new BadRequestException("El período de inscripción ya terminó.");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("El usuario no existe.");
    }

    const alreadyJoined = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId,
        },
      },
    });

    if (alreadyJoined) {
      throw new BadRequestException(
        "El usuario ya está inscrito en esta Polla.",
      );
    }

    /*
     * maxPlayers <= 0 significa
     * participantes ilimitados.
     */
    if (
      tournament.maxPlayers > 0 &&
      tournament.participants.length >= tournament.maxPlayers
    ) {
      throw new BadRequestException(
        "La Polla ya alcanzó el máximo de participantes.",
      );
    }

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

  // ============================================================
  // ESTADO DEL USUARIO EN UN TORNEO
  // ============================================================

  async getMyStatus(tournamentId: number, userId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
      include: {
        participants: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    const now = new Date();

    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId,
        },
      },
    });

    const registrationOpen =
      tournament.active &&
      now >= tournament.registrationStartsAt &&
      now <= tournament.registrationEndsAt;

    return {
      tournamentId: tournament.id,
      active: tournament.active,
      registrationOpen,
      registrationStartsAt: tournament.registrationStartsAt,
      registrationEndsAt: tournament.registrationEndsAt,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      inscription: tournament.inscription,
      prize: tournament.prize,
      maxPlayers: tournament.maxPlayers,
      participantsCount: tournament.participants.length,
      isParticipant: !!participant,
      paid: participant?.paid ?? false,
    };
  }

  // ============================================================
  // MATCHDAYS COMPLETOS
  // ============================================================

  async getMatches(tournamentId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    const matchdays = await this.prisma.matchday.findMany({
      where: {
        leagueId: tournament.leagueId,
        season: tournament.season,
      },
      include: {
        matches: {
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true,
              },
            },
          },
          orderBy: {
            date: "asc",
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        season: tournament.season,
        leagueId: tournament.leagueId,
      },
      matchdays: matchdays.map((matchday) => ({
        id: matchday.id,
        number: matchday.number,
        tournament: matchday.tournament,
        season: matchday.season,
        startDate: matchday.startDate,
        endDate: matchday.endDate,
        active: matchday.active,
        matches: matchday.matches,
      })),
    };
  }

  // ============================================================
  // RANKING DEL TORNEO
  // ============================================================

  async getRanking(tournamentId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                predictions: {
                  where: {
                    tournamentId,
                  },
                  select: {
                    points: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    const ranking = tournament.participants.map((participant) => {
      const points = participant.user.predictions.reduce(
        (sum, prediction) => sum + prediction.points,
        0,
      );

      return {
        id: participant.user.id,
        name: participant.user.name,
        points,
      };
    });

    return ranking
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return a.name.localeCompare(b.name);
      })
      .map((user, index) => ({
        position: index + 1,
        ...user,
      }));
  }

  // ============================================================
  // TODOS LOS TORNEOS
  // ============================================================

  async findAll() {
    return this.prisma.tournament.findMany({
      include: {
        league: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        startsAt: "asc",
      },
    });
  }

  // ============================================================
  // DETALLE
  // ============================================================

  async findOne(id: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id,
      },
      include: {
        league: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException("Torneo no encontrado");
    }

    return tournament;
  }

  // ============================================================
  // ACTUALIZAR TORNEO
  // ============================================================

  async update(id: number, dto: UpdateTournamentDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id,
      },
    });

    if (!tournament) {
      throw new NotFoundException("Torneo no encontrado");
    }

    const data: any = {
      ...dto,
    };

    if (dto.registrationStartsAt) {
      data.registrationStartsAt = new Date(dto.registrationStartsAt);
    }

    if (dto.registrationEndsAt) {
      data.registrationEndsAt = new Date(dto.registrationEndsAt);
    }

    if (dto.startsAt) {
      data.startsAt = new Date(dto.startsAt);
    }

    if (dto.endsAt) {
      data.endsAt = new Date(dto.endsAt);
    }

    const registrationStartsAt =
      data.registrationStartsAt ?? tournament.registrationStartsAt;

    const registrationEndsAt =
      data.registrationEndsAt ?? tournament.registrationEndsAt;

    const startsAt = data.startsAt ?? tournament.startsAt;

    const endsAt = data.endsAt ?? tournament.endsAt;

    if (registrationEndsAt <= registrationStartsAt) {
      throw new BadRequestException(
        "La fecha de finalización de inscripción debe ser posterior a la fecha de inicio de inscripción.",
      );
    }

    if (startsAt <= registrationEndsAt) {
      throw new BadRequestException(
        "El torneo debe comenzar después de finalizar el período de inscripción.",
      );
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        "La fecha de finalización debe ser posterior a la fecha de inicio del torneo.",
      );
    }

    return this.prisma.tournament.update({
      where: {
        id,
      },
      data,
    });
  }

  // ============================================================
  // DESACTIVAR
  // ============================================================

  async deactivate(id: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id,
      },
    });

    if (!tournament) {
      throw new NotFoundException("Torneo no encontrado");
    }

    return this.prisma.tournament.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
  }

  // ============================================================
  // PARTIDOS DISPONIBLES PARA ADMIN
  // ============================================================

  async getAvailableMatches(tournamentId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    return this.prisma.match.findMany({
      where: {
        leagueId: tournament.leagueId,
        matchday: {
          season: tournament.season,
        },
        date: {
          gt: new Date(),
        },
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logo: true,
          },
        },
        matchday: true,
      },
      orderBy: {
        date: "asc",
      },
    });
  }

  // ============================================================
  // SELECCIONAR LOS 10 PARTIDOS
  // ============================================================

  async selectMatches(tournamentId: number, matchIds: number[]) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    if (matchIds.length !== 10) {
      throw new BadRequestException(
        "La Polla debe tener exactamente 10 partidos.",
      );
    }

    const matches = await this.prisma.match.findMany({
      where: {
        id: {
          in: matchIds,
        },
        leagueId: tournament.leagueId,
        matchday: {
          season: tournament.season,
        },
      },
    });

    if (matches.length !== 10) {
      throw new BadRequestException(
        "Uno o más partidos no pertenecen a la liga o temporada de la Polla.",
      );
    }

    const now = new Date();

    const finishedOrStarted = matches.some(
      (match) => match.finished || new Date(match.date) <= now,
    );

    if (finishedOrStarted) {
      throw new BadRequestException(
        "Todos los partidos seleccionados deben ser futuros.",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentMatch.deleteMany({
        where: {
          tournamentId,
        },
      });

      await tx.tournamentMatch.createMany({
        data: matchIds.map((matchId, index) => ({
          tournamentId,
          matchId,
          position: index + 1,
        })),
      });
    });

    return this.getSelectedMatches(tournamentId);
  }

  // ============================================================
  // PARTIDOS SELECCIONADOS
  // ============================================================

  async getSelectedMatches(tournamentId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    const selected = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
      },
      include: {
        match: {
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true,
              },
            },
            matchday: true,
          },
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        season: tournament.season,
        leagueId: tournament.leagueId,
      },

      matches: selected.map((item) => ({
        position: item.position,
        ...item.match,
      })),
    };
  }
}
