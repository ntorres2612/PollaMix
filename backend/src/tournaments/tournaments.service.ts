import { canPublishWinners } from './prizes/prize-publication';
import { calculatePrizeDistribution } from './prizes/prize-distribution';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { FootballApiService } from "../football-api/football-api.service";
import {
  isAvailableKickoff,
  isBoardFixture,
  isSeniorNationalTeamLeague,
} from "../football-api/first-division";

import { CreateTournamentDto } from "./dto/create-tournament.dto";

import { UpdateTournamentDto } from "./dto/update-tournament.dto";

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications?: NotificationsService,
    private readonly football?: FootballApiService,
  ) { }

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

  async getUpcomingBoard() {
    const week = bogotaWeek(new Date());
    const fixtures = this.football
      ? await this.football
          .previewWeekFixtures(week.from, week.to, week.start, week.end)
          .catch(() => {
            console.warn(
              '[Total Gol] No se pudieron cargar los partidos de la semana.',
            );
            return [] as any[];
          })
      : [];

    const championships = new Map<string, {
      leagueId: number;
      season: number;
      name: string;
      country: string;
      rounds: Array<{
        id: number;
        roundName: string;
        number: number | null;
        matches: Array<{
          id: number;
          date: string;
          homeTeam: string;
          awayTeam: string;
          playable: boolean;
        }>;
      }>;
    }>();

    const now = Date.now();

    for (const fixture of fixtures) {
      const apiId = Number(fixture?.fixture?.id);
      const leagueId = Number(fixture?.league?.id);
      const season = Number(fixture?.league?.season);
      const kickoff = new Date(fixture?.fixture?.date);
      const homeTeam = String(fixture?.teams?.home?.name || '').trim();
      const awayTeam = String(fixture?.teams?.away?.name || '').trim();

      const status = String(fixture?.fixture?.status?.short || '');

      if (
        !Number.isSafeInteger(apiId) ||
        !Number.isSafeInteger(leagueId) ||
        !Number.isSafeInteger(season) ||
        Number.isNaN(kickoff.getTime()) ||
        !homeTeam ||
        !awayTeam ||
        !isBoardFixture(leagueId, homeTeam, awayTeam) ||
        !isAvailableKickoff(kickoff, status, now)
      ) {
        continue;
      }

      const key = `${leagueId}:${season}`;
      let championship = championships.get(key);

      if (!championship) {
        championship = {
          leagueId,
          season,
          name: String(fixture?.league?.name || `Liga ${leagueId}`),
          country: String(fixture?.league?.country || 'Desconocido'),
          rounds: [],
        };
        championships.set(key, championship);
      }

      const roundName = String(fixture?.league?.round || 'Fecha');
      let round = championship.rounds.find(
        (item) => item.roundName === roundName,
      );

      if (!round) {
        round = {
          id: championship.rounds.length + 1,
          roundName,
          number: null,
          matches: [],
        };
        championship.rounds.push(round);
      }

      round.matches.push({
        id: apiId,
        date: kickoff.toISOString(),
        homeTeam,
        awayTeam,
        playable: true,
      });
    }

    for (const championship of championships.values()) {
      for (const round of championship.rounds) {
        round.matches.sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    return {
      week: {
        from: week.from,
        to: week.to,
      },
      championships: [...championships.values()]
        .map((championship) => ({
          ...championship,
          upcoming: championship.rounds.reduce(
            (total, round) => total + round.matches.length,
            0,
          ),
        }))
        .sort((a, b) =>
          nationalTeamRank(a.leagueId) - nationalTeamRank(b.leagueId) ||
          b.upcoming - a.upcoming ||
          a.name.localeCompare(b.name, 'es'),
        ),
    };
  }

  async openFromSelection(body: unknown) {
    if (
      body === null ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      throw new BadRequestException('La solicitud no es válida.');
    }

    const input = body as Record<string, unknown>;
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const description =
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : null;
    const inscription = Number(input.inscription);
    const currency = input.currency === 'USD' ? 'USD' : 'COP';
    const matchIds = Array.isArray(input.matchIds)
      ? [...new Set(input.matchIds.map((id) => Number(id)))]
      : [];

    if (name.length < 3 || name.length > 120) {
      throw new BadRequestException(
        'El nombre de la Polla debe tener entre 3 y 120 caracteres.',
      );
    }

    if (
      !Number.isFinite(inscription) ||
      inscription < 0
    ) {
      throw new BadRequestException(
        'Revisa el valor de la inscripción.',
      );
    }

    if (
      matchIds.length < 1 ||
      matchIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      throw new BadRequestException(
        'Selecciona al menos un partido.',
      );
    }

    if (!this.football) {
      throw new BadRequestException(
        'No se pudo consultar el calendario.',
      );
    }

    const week = bogotaWeek(new Date());
    const fixtures = await this.football.findPreviewedFixtures(
      matchIds,
      week.from,
      week.to,
      week.start,
      week.end,
    );
    const kickoffs = fixtures.map((fixture) =>
      new Date(fixture.fixture.date).getTime(),
    );
    const now = Date.now();

    if (
      fixtures.some(
        (fixture) =>
          !isBoardFixture(
            Number(fixture?.league?.id),
            String(fixture?.teams?.home?.name || ''),
            String(fixture?.teams?.away?.name || ''),
          ),
      )
    ) {
      throw new BadRequestException(
        'Solo puedes armar la polla con partidos de primera división, amistosos de selecciones o eliminatorias de mayores.',
      );
    }

    if (
      fixtures.some((fixture, index) => {
        const status = String(fixture?.fixture?.status?.short || '');
        return !isAvailableKickoff(new Date(kickoffs[index]), status, now);
      })
    ) {
      throw new BadRequestException(
        'Todos los partidos seleccionados deben ser futuros.',
      );
    }

    const earliest = Math.min(...kickoffs);
    const latest = Math.max(...kickoffs);
    const registrationEndsAt = earliest - 60 * 60 * 1000;

    if (registrationEndsAt <= now + 60 * 1000) {
      throw new BadRequestException(
        'El primer partido queda demasiado cerca. Elige partidos que empiecen al menos dentro de una hora para abrir la inscripción.',
      );
    }

    const matches = await this.football.saveSelectedFixtures(
      matchIds,
      week.from,
      week.to,
      week.start,
      week.end,
    );
    const storedIds = matches.map((match) => match.id);
    const leagueCounts = new Map<number, number>();
    for (const match of matches) {
      leagueCounts.set(
        match.leagueId,
        (leagueCounts.get(match.leagueId) ?? 0) + 1,
      );
    }
    const leagueId = [...leagueCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0][0];
    const season = matches.find(
      (match) => match.leagueId === leagueId,
    )!.matchday.season;

    const tournament = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tournament.create({
        data: {
          name,
          description,
          leagueId,
          season,
          inscription,
          currency,
          prize: 0,
          maxPlayers: 0,
          registrationStartsAt: new Date(now),
          registrationEndsAt: new Date(registrationEndsAt),
          predictionsCloseAt: new Date(registrationEndsAt),
          startsAt: new Date(registrationEndsAt + 60 * 1000),
          endsAt: new Date(latest + 6 * 60 * 60 * 1000),
        },
      });

      await tx.tournamentMatch.createMany({
        data: storedIds.map((matchId, index) => ({
          tournamentId: created.id,
          matchId,
          position: index + 1,
        })),
      });

      return created;
    });

    return tournament;
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
        startsAt: true,
        registrationStartsAt: true,
        registrationEndsAt: true,
        endsAt: true,
      },
    });

    if (!tournament) {
      return null;
    }

    const [registered, predictions] = await Promise.all([
      this.prisma.tournamentParticipant.count({
        where: { tournamentId: tournament.id },
      }),
      this.prisma.pollEntry.count({
        where: visiblePredictionsWhere(tournament.id),
      }),
    ]);

    const registrationOpen =
      now >= tournament.registrationStartsAt &&
      now < tournament.registrationEndsAt &&
      now < tournament.startsAt;

    return {
      tournamentId: tournament.id,
      name: tournament.name,
      registered,
      predictions,
      registrationStartsAt: tournament.registrationStartsAt,
      registrationEndsAt: tournament.registrationEndsAt,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
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

    const [participantsCount, predictionsCount] = await Promise.all([
      this.prisma.tournamentParticipant.count({
        where: { tournamentId: tournament.id },
      }),
      this.prisma.pollEntry.count({
        where: visiblePredictionsWhere(tournament.id),
      }),
    ]);

    return {
      ...publicTournament,
      participantsCount,
      predictionsCount,
    };
  }

  // ============================================================
  // TORNEO ACTUAL DEL USUARIO
  // ============================================================

  // ============================================================
  // HISTORIAL DE POLLAS DEL USUARIO AUTENTICADO
  // Incluye torneos finalizados sin cambiar my-current.
  // ============================================================

  async getMyTournamentHistory(userId: number) {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return [];
    }

    const participations =
      await this.prisma.tournamentParticipant.findMany({
        where: {
          userId,
        },
        select: {
          tournament: {
            select: {
              id: true,
              name: true,
              description: true,
              leagueId: true,
              season: true,
              inscription: true,
              currency: true,
              prize: true,
              maxPlayers: true,
              registrationStartsAt: true,
              registrationEndsAt: true,
              startsAt: true,
              endsAt: true,
              active: true,
              resultsPublishedAt: true,
              resultsRevisedAt: true,
            },
          },
        },
        orderBy: [
          { tournament: { startsAt: "desc" } },
          { tournamentId: "desc" },
        ],
      });

    return participations.map(
      (participation) => participation.tournament,
    );
  }

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


    const predictionsCount = await this.prisma.pollEntry.count({
      where: visiblePredictionsWhere(tournamentId),
    });

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
      predictionsCount,
      isParticipant: !!participant,
      paid: participant?.paid ?? false,
    };

  }

  async getMyEntries(tournamentId: number, userId: number) {
    const entries = await this.prisma.pollEntry.findMany({
      where: {
        ...visiblePredictionsWhere(tournamentId),
        userId,
      },
      orderBy: { id: 'asc' },
      include: {
        predictions: {
          select: {
            matchId: true,
            homeScore: true,
            awayScore: true,
            points: true,
          },
        },
        payments: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED'],
            },
          },
          orderBy: { id: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            amount: true,
            reference: true,
          },
        },
      },
    });

    return entries.map((entry, index) => ({
      id: entry.id,
      number: index + 1,
      paid: entry.paid,
      pending: !entry.paid,
      predictionsSubmittedAt: entry.predictionsSubmittedAt,
      payment: entry.payments[0] ?? null,
      predictions: entry.predictions.map((prediction) => ({
        matchId: prediction.matchId,
        points: prediction.points,
        selection:
          prediction.homeScore > prediction.awayScore
            ? 'HOME'
            : prediction.homeScore < prediction.awayScore
              ? 'AWAY'
              : 'DRAW',
      })),
    }));
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
      where: { id: tournamentId },
      select: { id: true },
    });

    if (!tournament) {
      throw new NotFoundException("La Polla no existe.");
    }

    const entries = await this.prisma.pollEntry.findMany({
      where: {
        tournamentId,
        paid: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        predictions: {
          where: { tournamentId },
          select: { points: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const slipsByUser = new Map<number, number>();

    const ranking = entries.map((entry) => {
      const slipNumber = (slipsByUser.get(entry.userId) ?? 0) + 1;
      slipsByUser.set(entry.userId, slipNumber);

      const points = entry.predictions.reduce(
        (sum, prediction) => sum + prediction.points,
        0,
      );

      return {
        id: entry.id,
        userId: entry.user.id,
        entryId: entry.id,
        slipNumber,
        name: entry.user.name,
        points,
      };
    });

    const repeatedUsers = new Set(
      ranking
        .filter((row) => (slipsByUser.get(row.userId) ?? 0) > 1)
        .map((row) => row.userId),
    );

    return ranking
      .map((row) => ({
        ...row,
        name: repeatedUsers.has(row.userId)
          ? `${row.name} · Pronóstico ${row.slipNumber}`
          : row.name,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return a.name.localeCompare(b.name);
      })
      .reduce<Array<{
        position: number;
        id: number;
        userId: number;
        entryId: number;
        name: string;
        points: number;
      }>>((rows, entry) => {
        const previous = rows[rows.length - 1];

        const position =
          previous && previous.points === entry.points
            ? previous.position
            : previous
              ? previous.position + 1
              : 1;

        rows.push({
          position,
          id: entry.id,
          userId: entry.userId,
          entryId: entry.entryId,
          name: entry.name,
          points: entry.points,
        });
        return rows;
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
        finished: false,
        date: {
          gt: new Date(),
        },
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
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

    const uniqueMatchIds = [...new Set(matchIds)];

    if (
      uniqueMatchIds.length < 1 ||
      uniqueMatchIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      throw new BadRequestException(
        "Selecciona al menos un partido.",
      );
    }

    const matches = await this.prisma.match.findMany({
      where: {
        id: {
          in: uniqueMatchIds,
        },
      },
    });

    if (matches.length !== uniqueMatchIds.length) {
      throw new BadRequestException(
        "Uno o más partidos ya no están disponibles.",
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

      // POLLAMIX_BLOCK_PUBLISHED_SELECTION
      // El torneo está bloqueado FOR UPDATE en esta transacción.
      const publication = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: { resultsPublishedAt: true },
      });

      if (publication?.resultsPublishedAt !== null &&
          publication?.resultsPublishedAt !== undefined) {
        throw new BadRequestException(
          'No se pueden cambiar los partidos después de publicar resultados.',
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
        data: uniqueMatchIds.map((matchId, index) => ({
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
            league: {
              select: {
                id: true,
                name: true,
                country: true,
              },
            },
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
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        registrationEndsAt: { lte: new Date() },
      },
      orderBy: { startsAt: 'desc' },
      take: 30,
      select: {
        id: true,
        name: true,
        season: true,
        startsAt: true,
        prizeClosure: {
          select: { closedAt: true },
        },
        tournamentMatches: {
          orderBy: { position: 'asc' },
          take: 1,
          select: {
            match: { select: { date: true } },
          },
        },
      },
    });

    return tournaments.map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      season: tournament.season,
      closedAt: tournament.prizeClosure?.closedAt ?? null,
      startsAt: tournament.startsAt,
      firstMatchAt:
        tournament.tournamentMatches[0]?.match.date ?? tournament.startsAt,
    }));
  }

  async getMyPrizes(userId: number) {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new BadRequestException('Usuario inválido.');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!account) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (account.role === 'ADMIN') {
      return this.getAdminEarnings();
    }

    const closures = await this.prisma.tournamentPrizeClosure.findMany({
      orderBy: { closedAt: 'desc' },
      select: {
        closedAt: true,
        winners: true,
        tournament: {
          select: {
            id: true,
            name: true,
            season: true,
          },
        },
      },
    });

    const history: Array<{
      tournamentId: number;
      tournamentName: string;
      season: number;
      closedAt: Date | null;
      position: number;
      points: number;
      amountCOP: number;
      provisional: boolean;
      entryId: number | null;
      paid: boolean;
      paidAt: Date | null;
    }> = [];

    const payouts = await this.prisma.prizePayout.findMany({
      where: { userId },
      select: {
        tournamentId: true,
        entryId: true,
        amountCOP: true,
        paidAt: true,
      },
    });

    const findPayout = (
      tournamentId: number,
      entryId: number | null,
      amountCOP: number,
    ) => payouts.find((payout) =>
      payout.tournamentId === tournamentId &&
      (
        (entryId !== null && payout.entryId === entryId) ||
        (entryId === null && payout.entryId === null && payout.amountCOP === amountCOP)
      ),
    ) ?? null;

    for (const closure of closures) {
      if (!Array.isArray(closure.winners)) continue;

      for (const item of closure.winners) {
        if (
          item === null ||
          typeof item !== 'object' ||
          Array.isArray(item)
        ) {
          continue;
        }

        const winner = item as {
          userId?: number;
          entryId?: number | null;
          position?: number;
          rank?: number;
          points?: number;
          amountCOP?: number;
        };

        if (winner.userId !== userId) continue;

        const position = winner.position ?? winner.rank;
        if (
          !Number.isSafeInteger(position) ||
          !Number.isSafeInteger(winner.points) ||
          !Number.isSafeInteger(winner.amountCOP) ||
          (winner.amountCOP ?? 0) < 0
        ) {
          continue;
        }

        const entryId = typeof winner.entryId === 'number' ? winner.entryId : null;
        const payout = findPayout(
          closure.tournament.id,
          entryId,
          winner.amountCOP as number,
        );

        history.push({
          tournamentId: closure.tournament.id,
          tournamentName: closure.tournament.name,
          season: closure.tournament.season,
          closedAt: closure.closedAt,
          position: position as number,
          points: winner.points as number,
          amountCOP: winner.amountCOP as number,
          provisional: false,
          entryId,
          paid: payout !== null,
          paidAt: payout?.paidAt ?? null,
        });
      }
    }

    const creditedTournamentIds = new Set(
      history.map((prize) => prize.tournamentId),
    );

    const openTournaments = await this.prisma.tournament.findMany({
      where: {
        active: true,
        registrationEndsAt: { lte: new Date() },
        prizeClosure: { is: null },
        ...(creditedTournamentIds.size > 0
          ? { id: { notIn: [...creditedTournamentIds] } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        season: true,
      },
    });

    for (const tournament of openTournaments) {
      const calculated = await this.getPrizes(tournament.id, 'admin');
      const winners = Array.isArray(calculated.winners)
        ? calculated.winners
        : [];

      for (const item of winners) {
        if (
          item === null ||
          typeof item !== 'object' ||
          Array.isArray(item)
        ) {
          continue;
        }

        const winner = item as {
          userId?: number;
          entryId?: number | null;
          position?: number;
          points?: number;
          amountCOP?: number;
        };

        const position = winner.position;
        const points = winner.points;
        const amountCOP = winner.amountCOP;

        if (
          winner.userId !== userId ||
          typeof position !== "number" ||
          typeof points !== "number" ||
          typeof amountCOP !== "number" ||
          !Number.isSafeInteger(position) ||
          !Number.isSafeInteger(points) ||
          !Number.isSafeInteger(amountCOP) ||
          amountCOP < 0
        ) {
          continue;
        }

        const entryId = typeof winner.entryId === 'number' ? winner.entryId : null;
        const payout = findPayout(tournament.id, entryId, amountCOP);

        history.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          season: tournament.season,
          closedAt: null,
          position,
          points,
          amountCOP,
          provisional: true,
          entryId,
          paid: payout !== null,
          paidAt: payout?.paidAt ?? null,
        });
      }
    }

    return {
      currency: 'COP' as const,
      balanceKind: 'winnings' as const,
      balanceCOP: history.reduce(
        (sum, prize) => sum + (prize.paid ? 0 : prize.amountCOP),
        0,
      ),
      history,
    };
  }

  private async getAdminEarnings() {
    const history: Array<{
      tournamentId: number;
      tournamentName: string;
      season: number;
      closedAt: Date | null;
      position: number;
      points: number;
      amountCOP: number;
      provisional: boolean;
      concept: 'ganancia';
    }> = [];

    const closures = await this.prisma.tournamentPrizeClosure.findMany({
      orderBy: { closedAt: 'desc' },
      select: {
        closedAt: true,
        profitCOP: true,
        tournament: {
          select: { id: true, name: true, season: true },
        },
      },
    });

    for (const closure of closures) {
      if (
        !Number.isSafeInteger(closure.profitCOP) ||
        closure.profitCOP < 0
      ) {
        continue;
      }

      history.push({
        tournamentId: closure.tournament.id,
        tournamentName: closure.tournament.name,
        season: closure.tournament.season,
        closedAt: closure.closedAt,
        position: 0,
        points: 0,
        amountCOP: closure.profitCOP,
        provisional: false,
        concept: 'ganancia',
      });
    }

    const closedIds = new Set(history.map((item) => item.tournamentId));
    const openTournaments = await this.prisma.tournament.findMany({
      where: {
        active: true,
        registrationEndsAt: { lte: new Date() },
        prizeClosure: { is: null },
        ...(closedIds.size > 0 ? { id: { notIn: [...closedIds] } } : {}),
      },
      select: { id: true, name: true, season: true },
    });

    for (const tournament of openTournaments) {
      try {
        const calculated = await this.getPrizes(tournament.id, 'admin');
        const profitCOP = calculated.profitCOP;

        if (typeof profitCOP !== 'number' || !Number.isSafeInteger(profitCOP) || profitCOP < 0) {
          continue;
        }

        history.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          season: tournament.season,
          closedAt: null,
          position: 0,
          points: 0,
          amountCOP: profitCOP,
          provisional: true,
          concept: 'ganancia',
        });
      } catch {
        continue;
      }
    }

    return {
      currency: 'COP' as const,
      balanceKind: 'profit' as const,
      balanceCOP: history.reduce((sum, item) => sum + item.amountCOP, 0),
      history,
    };
  }

  async markWinnerPaid(
    tournamentId: number,
    entryId: number,
    adminId: number,
  ) {
    if (
      !Number.isSafeInteger(tournamentId) ||
      tournamentId <= 0 ||
      !Number.isSafeInteger(entryId) ||
      entryId <= 0 ||
      !Number.isSafeInteger(adminId) ||
      adminId <= 0
    ) {
      throw new BadRequestException('Los datos del pago no son válidos.');
    }

    const prizes = await this.getPrizes(tournamentId, 'admin');
    const winners = Array.isArray(prizes.winners) ? prizes.winners : [];
    const winner = winners.find((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
      return (item as { entryId?: number }).entryId === entryId;
    }) as {
      userId?: number;
      amountCOP?: number;
      entryId?: number;
      position?: number;
    } | undefined;

    const userId = winner?.userId;
    const amountCOP = winner?.amountCOP;

    if (
      !winner ||
      typeof userId !== 'number' ||
      typeof amountCOP !== 'number' ||
      !Number.isSafeInteger(userId) ||
      !Number.isSafeInteger(amountCOP) ||
      amountCOP < 0
    ) {
      throw new BadRequestException(
        'Ese pronóstico no tiene un premio para pagar.',
      );
    }

    const existing = await this.prisma.prizePayout.findFirst({
      where: { tournamentId, entryId },
    });

    if (existing) {
      return {
        paid: true,
        alreadyPaid: true,
        entryId,
        amountCOP: existing.amountCOP,
      };
    }

    const saved = await this.prisma.prizePayout.create({
      data: {
        tournamentId,
        entryId,
        userId,
        amountCOP,
        adminId,
      },
    });

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true },
    });

    if (this.notifications) {
      await this.notifications.notifyPrizePaid({
        userId,
        tournamentId,
        entryId,
        payoutId: saved.id,
        tournamentName: tournament?.name ?? 'Polla',
        position: typeof winner.position === 'number' ? winner.position : null,
        amountCOP: saved.amountCOP,
        paidAt: saved.paidAt,
      });
    }

    return {
      paid: true,
      alreadyPaid: false,
      entryId: saved.entryId,
      amountCOP: saved.amountCOP,
      paidAt: saved.paidAt,
    };
  }

  private async annotateWinnerPayouts(
    tournamentId: number,
    winners: unknown,
  ) {
    if (!Array.isArray(winners)) return winners;

    const payouts = await this.prisma.prizePayout.findMany({
      where: { tournamentId },
      select: { entryId: true, userId: true, amountCOP: true, paidAt: true },
    });

    return winners.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return item;
      }

      const winner = item as {
        entryId?: number | null;
        userId?: number;
        amountCOP?: number;
      };
      const payout = payouts.find((itemPayout) =>
        (typeof winner.entryId === 'number' && itemPayout.entryId === winner.entryId) ||
        (
          winner.entryId == null &&
          itemPayout.entryId == null &&
          itemPayout.userId === winner.userId &&
          itemPayout.amountCOP === winner.amountCOP
        ),
      );

      return {
        ...winner,
        paid: Boolean(payout),
        paidAt: payout?.paidAt ?? null,
      };
    });
  }

  private async attachWinnerPhones(winners: unknown) {
    if (!Array.isArray(winners) || winners.length === 0) {
      return winners;
    }

    const userIds = [...new Set(
      winners
        .map((item) =>
          item && typeof item === 'object' && !Array.isArray(item)
            ? (item as { userId?: number }).userId
            : undefined,
        )
        .filter((id): id is number =>
          typeof id === 'number' && Number.isSafeInteger(id) && id > 0,
        ),
    )];

    if (userIds.length === 0) {
      return winners;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, phone: true },
    });
    const phones = new Map(users.map((user) => [user.id, user.phone]));

    return winners.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return item;
      }

      const userId = (item as { userId?: number }).userId;

      return {
        ...item,
        phone: typeof userId === 'number' ? phones.get(userId) ?? null : null,
      };
    });
  }

  async getPrizes(
    tournamentId: number,
    audience: 'public' | 'admin' = 'public',
  ) {
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
        winners: audience === 'admin'
          ? await this.attachWinnerPhones(
              await this.annotateWinnerPayouts(tournamentId, closure.winners),
            )
          : closure.winners,
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
        entryId: true,
        amount: true,
      },
    });

    const paidKeys = new Set<number>();
    let revenueCOP = 0;

    for (const payment of payments) {
      const slipKey = payment.entryId ?? payment.userId;

      if (
        paidKeys.has(slipKey) ||
        !Number.isSafeInteger(payment.amount) ||
        payment.amount <= 0
      ) {
        throw new BadRequestException(
          'Los pagos aprobados contienen inconsistencias.',
        );
      }

      paidKeys.add(slipKey);
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
      .filter((player) => paidKeys.has(player.entryId ?? player.id))
      .map((player) => ({
        userId: player.userId ?? player.id,
        entryId: player.entryId,
        points: player.points,
        name: player.name,
      }));

    if (eligible.length !== paidKeys.size) {
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
      paidKeys.size > 0 &&
      payments.every(
        (payment) => payment.amount === tournament.inscription,
      );

    const tournamentEnded = new Date() >= tournament.endsAt;
    const winnersReady = canPublishWinners({
      tournamentEnded,
      matchesReady,
      paymentsReady,
    });
    const showEachWinner =
      audience === 'admin'
        ? matchesReady && paymentsReady
        : winnersReady;

    const distribution = calculatePrizeDistribution(
      revenueCOP,
      showEachWinner
        ? eligible.map(({ userId, entryId, points }) => ({
            userId,
            ...(entryId != null ? { entryId } : {}),
            points,
          }))
        : [],
    );

    const winners = showEachWinner
      ? distribution.winners.map((winner) => ({
          ...winner,
          name:
            eligible.find((player) =>
              winner.entryId != null
                ? player.entryId === winner.entryId
                : player.userId === winner.userId,
            )?.name ?? '',
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
      winners: audience === 'admin'
        ? await this.attachWinnerPhones(
            await this.annotateWinnerPayouts(tournamentId, winners),
          )
        : winners,
      allocatedCOP: winnersReady
        ? distribution.allocatedCOP
        : null,
      undistributedCOP: winnersReady
        ? distribution.undistributedCOP
        : null,
    };
  }
}

function nationalTeamRank(leagueId: number) {
  if (leagueId === 10) return 0;
  if (isSeniorNationalTeamLeague(leagueId)) return 1;
  return 2;
}

function bogotaWeek(now: Date) {
  const timeZone = 'America/Bogota';
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  const index: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = index[weekday] ?? 1;
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const [year, month, date] = ymd.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, date - daysFromMonday));
  const sunday = new Date(Date.UTC(year, month - 1, date - daysFromMonday + 6));
  const from = monday.toISOString().slice(0, 10);
  const to = sunday.toISOString().slice(0, 10);

  return {
    from,
    to,
    start: new Date(`${from}T05:00:00.000Z`),
    end: new Date(Date.parse(`${to}T05:00:00.000Z`) + 24 * 60 * 60 * 1000),
  };
}

function visiblePredictionsWhere(tournamentId: number) {
  return {
    tournamentId,
    OR: [
      { payments: { none: { status: 'REJECTED' } } },
      { payments: { some: { status: { in: ['PENDING', 'APPROVED'] } } } },
    ],
  };
}
