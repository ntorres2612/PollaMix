import { canPublishWinners } from './prizes/prize-publication';
import { calculatePrizeDistribution } from './prizes/prize-distribution';
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
  constructor(private readonly prisma: PrismaService) { }

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
        currency: dto.currency ?? 'COP',
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

  async getHomeStats() {
    const now = new Date();

    const tournament = await this.prisma.tournament.findFirst({
      where: {
        active: true,
        endsAt: { gt: now },
      },
      orderBy: [
        { startsAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        maxPlayers: true,
        startsAt: true,
        registrationStartsAt: true,
        registrationEndsAt: true,
        endsAt: true,
      },
    });

    if (!tournament) {
      return null;
    }

    const registered = await this.prisma.tournamentParticipant.count({
      where: { tournamentId: tournament.id },
    });

    const hasLimit = tournament.maxPlayers > 0;

    const registrationOpen =
      now >= tournament.registrationStartsAt &&
      now < tournament.registrationEndsAt &&
      now < tournament.startsAt &&
      (!hasLimit || registered < tournament.maxPlayers);

    return {
      tournamentId: tournament.id,
      name: tournament.name,
      registered,
      registrationStartsAt: tournament.registrationStartsAt,
      registrationEndsAt: tournament.registrationEndsAt,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      maxPlayers: hasLimit ? tournament.maxPlayers : null,
      available: hasLimit
        ? Math.max(0, tournament.maxPlayers - registered)
        : null,
      registrationOpen,
    };
  }

  async getWinnerContacts(tournamentId: number) {
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
      throw new BadRequestException('Torneo inválido.');
    }

    const closure = await this.prisma.tournamentPrizeClosure.findUnique({
      where: { tournamentId },
      select: {
        tournamentId: true,
        winners: true,
        closedAt: true,
        currency: true,
      },
    });

    if (!closure) {
      return {
        tournamentId,
        finalized: false,
        winners: [],
        message: 'Este torneo todavía no tiene ganadores definitivos.',
      };
    }

    if (!Array.isArray(closure.winners)) {
      throw new Error('El cierre no contiene una lista válida de ganadores.');
    }

    type StoredWinner = {
      userId: number;
      position?: number;
      rank?: number;
      points?: number;
      amountCOP?: number;
    };

    const winners = closure.winners as StoredWinner[];

    if (winners.some(
      (winner) =>
        !winner ||
        !Number.isSafeInteger(winner.userId) ||
        winner.userId <= 0
    )) {
      throw new Error('Los ganadores almacenados tienen IDs inválidos.');
    }

    const userIds = [...new Set(winners.map((winner) => winner.userId))];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    const byId = new Map(users.map((user) => [user.id, user]));

    if (users.length !== userIds.length) {
      throw new Error('No se encontraron todos los usuarios premiados.');
    }

    return {
      tournamentId,
      finalized: true,
      closedAt: closure.closedAt,
      currency: closure.currency,
      winners: winners.map((winner, index) => ({
        userId: winner.userId,
        position:
          Number.isSafeInteger(winner.position)
            ? winner.position
            : Number.isSafeInteger(winner.rank)
              ? winner.rank
              : null,
        order: index + 1,
        points: typeof winner.points === 'number'
          ? winner.points
          : null,
        amountCOP: typeof winner.amountCOP === 'number'
          ? winner.amountCOP
          : null,
        name: byId.get(winner.userId)!.name,
        email: byId.get(winner.userId)!.email,
        phone: byId.get(winner.userId)!.phone,
      })),
    };
  }

  async getCurrent() {
    const now = new Date();

    const tournament = await this.prisma.tournament.findFirst({
      where: {
        active: true,
        registrationStartsAt: {
          lte: now,
        },
        registrationEndsAt: {
          gt: now,
        },
        endsAt: {
          gte: now,
        },
      },
      orderBy: [
        {
          startsAt: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

    if (!tournament) {
      return null;
    }

    const { prize, ...publicTournament } = tournament;

    return publicTournament;
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
      orderBy: [
        { tournament: { startsAt: "desc" } },
        { tournamentId: "desc" },
      ],
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
      predictionsCloseAt: tournament.predictionsCloseAt,
      predictionsSubmittedAt:
        participant?.predictionsSubmittedAt ?? null,
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
      .reduce<Array<{
        position: number;
        id: number;
        name: string;
        points: number;
      }>>((ranking, user) => {
        const previous = ranking[ranking.length - 1];

        const position =
          previous && previous.points === user.points
            ? previous.position
            : previous
              ? previous.position + 1
              : 1;

        ranking.push({ position, ...user });
        return ranking;
      }, []);
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

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tournament" WHERE id = ${id} FOR UPDATE`;
      const closure = await tx.tournamentPrizeClosure.findUnique({ where: { tournamentId: id }, select: { id: true } });
      if (closure) throw new BadRequestException('No se puede editar una Polla con premios cerrados.');
      return tx.tournament.update({ where: { id }, data });
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

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tournament" WHERE id = ${id} FOR UPDATE`;
      const closure = await tx.tournamentPrizeClosure.findUnique({ where: { tournamentId: id }, select: { id: true } });
      if (closure) throw new BadRequestException('No se puede desactivar una Polla con premios cerrados.');
      return tx.tournament.update({ where: { id }, data: { active: false } });
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
      // El mismo bloqueo debe respetarse en cualquier futuro flujo que cambie la selección.
      await tx.$queryRaw`SELECT id FROM "Tournament" WHERE id = ${tournamentId} FOR UPDATE`;

      // Impedir cambiar partidos después del cierre definitivo.
      const prizeClosure =
        await tx.tournamentPrizeClosure.findUnique({
          where: { tournamentId },
          select: { id: true },
        });

      if (prizeClosure) {
        throw new BadRequestException(
          'No se pueden modificar los partidos: los premios de esta Polla ya están cerrados.',
        );
      }
      const [existingPredictions, confirmedParticipants] = await Promise.all([
        tx.prediction.count({ where: { tournamentId } }),
        tx.tournamentParticipant.count({
          where: { tournamentId, predictionsSubmittedAt: { not: null } },
        }),
      ]);
      if (existingPredictions > 0 || confirmedParticipants > 0) {
        throw new BadRequestException(
          'No se pueden modificar los partidos: ya existen pronósticos registrados o confirmados.',
        );
      }
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


  // ============================================================
  // PREMIOS DEFINITIVOS - PUBLICACION AL CIERRE
  // ============================================================

  async getPrizeHistory() {
    const closures = await this.prisma.tournamentPrizeClosure.findMany({
      orderBy: { closedAt: 'desc' },
      take: 30,
      select: {
        tournamentId: true,
        closedAt: true,
        tournament: {
          select: {
            id: true,
            name: true,
            season: true,
          },
        },
      },
    });

    return closures.map((entry) => ({
      id: entry.tournament.id,
      name: entry.tournament.name,
      season: entry.tournament.season,
      closedAt: entry.closedAt,
    }));
  }

  async getPrizes(tournamentId: number) {
    const closure = await this.prisma.tournamentPrizeClosure.findUnique({
      where: { tournamentId },
    });

    if (closure) {
      return {
        tournamentId,
        published: true,
        winnersPublished: true,
        resultsReady: true,
        paymentsReady: true,
        tournamentEnded: true,
        finalized: true,
        closedAt: closure.closedAt,
        currency: closure.currency,
        registeredPaidPlayers: closure.paidPlayers,
        revenueCOP: closure.revenueCOP,
        prizePoolCOP: closure.prizePoolCOP,
        profitCOP: closure.profitCOP,
        prizes: {
          first: closure.firstCOP,
          second: closure.secondCOP,
          third: closure.thirdCOP,
        },
        winners: closure.winners,
        allocatedCOP: closure.allocatedCOP,
        undistributedCOP: closure.undistributedCOP,
      };
    }
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        inscription: true,
        currency: true,
        registrationEndsAt: true,
        endsAt: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException('La Polla no existe.');
    }

    if (tournament.currency !== 'COP') {
      throw new BadRequestException(
        'Este torneo debe utilizar pesos colombianos.',
      );
    }

    // Antes del cierre de inscripciones no se publican premios.
    if (new Date() < tournament.registrationEndsAt) {
      return {
        tournamentId,
        published: false,
        winnersPublished: false,
        currency: 'COP',
        prizes: null,
        winners: null,
        message: 'Premios pendientes de publicación.',
      };
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        tournamentId,
        currency: 'COP',
        status: 'APPROVED',
      },
      select: {
        userId: true,
        amount: true,
      },
    });

    // Un solo pago aprobado por jugador.
    const paidUserIds = new Set<number>();
    let revenueCOP = 0;

    for (const payment of payments) {
      if (
        paidUserIds.has(payment.userId) ||
        !Number.isSafeInteger(payment.amount) ||
        payment.amount <= 0
      ) {
        throw new BadRequestException(
          'Los pagos aprobados contienen inconsistencias.',
        );
      }

      paidUserIds.add(payment.userId);
      revenueCOP += payment.amount;
    }

    if (!Number.isSafeInteger(revenueCOP)) {
      throw new BadRequestException(
        'La recaudación supera el importe permitido.',
      );
    }

    // Se utiliza el mismo motor para el fondo de premios
    // y para la distribución entre ganadores.
    const ranking = await this.getRanking(tournamentId);

    const eligible = ranking
      .filter((player) => paidUserIds.has(player.id))
      .map((player) => ({
        userId: player.id,
        points: player.points,
        name: player.name,
      }));

    if (eligible.length !== paidUserIds.size) {
      throw new BadRequestException(
        'Hay pagos aprobados sin participante válido.',
      );
    }

    // Verificar exclusivamente los partidos seleccionados.
    const selectedMatches = await this.prisma.tournamentMatch.findMany({
      where: { tournamentId },
      select: {
        match: {
          select: {
            finished: true,
            scoredAt: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
    });

    const matchesReady =
      selectedMatches.length > 0 &&
      selectedMatches.every(({ match }) =>
        match.finished &&
        match.scoredAt !== null &&
        match.homeScore !== null &&
        match.awayScore !== null
      );

    // Evitar publicar ganadores con pagos históricos
    // que no cubren la inscripción actual del torneo.
    const paymentsReady =
      paidUserIds.size > 0 &&
      payments.every(
        (payment) => payment.amount === tournament.inscription,
      );

    const tournamentEnded = new Date() >= tournament.endsAt;
    const winnersReady = canPublishWinners({
      tournamentEnded,
      matchesReady,
      paymentsReady,
    });

    const distribution = calculatePrizeDistribution(
      revenueCOP,
      winnersReady
        ? eligible.map(({ userId, points }) => ({
            userId,
            points,
          }))
        : [],
    );

    const winners = winnersReady
      ? distribution.winners.map((winner) => ({
          ...winner,
          name:
            eligible.find((p) => p.userId === winner.userId)
              ?.name ?? '',
        }))
      : null;

    return {
      tournamentId,
      published: true,
      winnersPublished: winnersReady,
      resultsReady: matchesReady,
      paymentsReady,
      tournamentEnded,
      currency: 'COP',
      registeredPaidPlayers: eligible.length,
      revenueCOP: distribution.revenueCOP,
      prizePoolCOP: distribution.prizePoolCOP,
      profitCOP: distribution.profitCOP,
      prizes: {
        first: distribution.firstCOP,
        second: distribution.secondCOP,
        third: distribution.thirdCOP,
      },
      winners,
      allocatedCOP: winnersReady
        ? distribution.allocatedCOP
        : null,
      undistributedCOP: winnersReady
        ? distribution.undistributedCOP
        : null,
    };
  }
}
