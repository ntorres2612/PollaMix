import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { FootballApiClient } from './football-api.client';
import { ScoringService } from '../predictions/scoring/scoring.service';
import { EspnFootballService } from './espn/espn-football.service';

@Injectable()
export class FootballApiService {
  private syncInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: FootballApiClient,
    private readonly scoringService: ScoringService,
    private readonly espnFootballService: EspnFootballService,
  ) {}

  @Cron('*/10 * * * *', {
    name: 'pollamix-results-sync',
  })
  async syncActiveTournamentResults() {
    if (this.syncInProgress) {
      console.warn(
        '[CRON] Sincronización omitida: ya existe una sincronización en progreso.',
      );

      return {
        success: false,
        skipped: true,
        message:
          'Ya existe una sincronización en progreso.',
      };
    }

    this.syncInProgress = true;

    const startedAt =
      new Date();

    try {
      const now =
        new Date();

      const tournaments =
        await this.prisma.tournament.findMany({
          where: {
            active: true,
            endsAt: {
              gte: now,
            },
          },

          select: {
            id: true,
            name: true,
            leagueId: true,
            season: true,
          },

          orderBy: {
            startsAt: 'asc',
          },
        });

      if (
        tournaments.length ===
        0
      ) {
        console.log(
          '[CRON] No existen Pollas activas para sincronizar.',
        );

        return {
          success: true,
          skipped: false,
          tournamentsFound: 0,
          competitions: 0,
          results: [],
          startedAt,
          finishedAt:
            new Date(),
        };
      }

      const competitions =
        Array.from(
          new Map(
            tournaments.map(
              (tournament) => [
                `${tournament.leagueId}-${tournament.season}`,
                {
                  leagueId:
                    tournament.leagueId,

                  season:
                    tournament.season,
                },
              ],
            ),
          ).values(),
        );

      console.log(
        '[CRON] Pollas activas:',
        tournaments.length,
      );

      console.log(
        '[CRON] Combinaciones liga/temporada:',
        competitions.length,
      );

      const results: Array<{
        leagueId: number;
        season: number;
        success: boolean;
        result?: any;
        error?: string;
      }> = [];

      for (
        const competition of
          competitions
      ) {
        try {
          const result =
            await this.updateResults(
              competition.leagueId,
              competition.season,
            );

          results.push({
            leagueId:
              competition.leagueId,

            season:
              competition.season,

            success: true,
            result,
          });
        } catch (
          error
        ) {
          results.push({
            leagueId:
              competition.leagueId,

            season:
              competition.season,

            success: false,

            error:
              error instanceof
              Error
                ? error.message
                : String(error),
          });
        }
      }

      return {
        success: true,
        skipped: false,
        tournamentsFound:
          tournaments.length,

        competitions:
          competitions.length,

        results,

        startedAt,

        finishedAt:
          new Date(),
      };
    } finally {
      this.syncInProgress =
        false;
    }
  }

  async getLeagues() {
    return {
      ok: true,
    };
  }

  async importLeagues() {
    const data =
      await this.client.get(
        '/leagues',
      );

    const leagues =
      data.response ?? [];

    let imported = 0;

    for (
      const item of
        leagues
    ) {
      await this.prisma.league.upsert({
        where: {
          id:
            item.league.id,
        },

        update: {
          name:
            item.league.name,

          type:
            item.league.type,

          country:
            item.country.name,

          countryCode:
            item.country.code,

          logo:
            item.league.logo,

          season:
            item.seasons.at(-1)
              ?.year ??
            2026,

          active: true,
        },

        create: {
          id:
            item.league.id,

          name:
            item.league.name,

          type:
            item.league.type,

          country:
            item.country.name,

          countryCode:
            item.country.code,

          logo:
            item.league.logo,

          season:
            item.seasons.at(-1)
              ?.year ??
            2026,

          active: true,
        },
      });

      imported++;
    }

    return {
      success: true,
      imported,
    };
  }

  async importTeams(
    leagueId: number,
    season: number,
  ) {
    const response =
      await this.client.get(
        '/teams',
        {
          league: leagueId,
          season,
        },
      );

    if (
      response.errors &&
      Object.keys(
        response.errors,
      ).length > 0
    ) {
      throw new BadRequestException({
        message:
          'Error al consultar API-Sports.',

        errors:
          response.errors,

        leagueId,
        season,
      });
    }

    const teams =
      response.response ?? [];

    for (
      const item of
        teams
    ) {
      await this.prisma.team.upsert({
        where: {
          id:
            item.team.id,
        },

        update: {
          name:
            item.team.name,

          shortName:
            item.team.code ??
            item.team.name
              .substring(
                0,
                3,
              )
              .toUpperCase(),

          logo:
            item.team.logo,

          leagueId,
        },

        create: {
          id:
            item.team.id,

          name:
            item.team.name,

          shortName:
            item.team.code ??
            item.team.name
              .substring(
                0,
                3,
              )
              .toUpperCase(),

          logo:
            item.team.logo,

          leagueId,
        },
      });
    }

    return {
      success: true,
      imported:
        teams.length,
    };
  }

  async importMatches(
    leagueId: number,
    season: number,
  ) {
    const response =
      await this.client.get(
        '/fixtures',
        {
          league: leagueId,
          season,
        },
      );

    if (
      response.errors &&
      Object.keys(
        response.errors,
      ).length > 0
    ) {
      throw new BadRequestException({
        message:
          'Error al consultar API-Sports.',

        errors:
          response.errors,

        leagueId,
        season,
      });
    }

    const fixtures =
      response.response ?? [];

    if (
      fixtures.length ===
      0
    ) {
      return {
        success: true,
        imported: 0,
        updated: 0,
        matchdaysCreated: 0,
        skipped: 0,
        total: 0,
        fixturesReceived: 0,
        leagueId,
        season,
      };
    }

    let imported = 0;
    let updated = 0;
    let matchdaysCreated =
      0;

    let skipped = 0;

    const skippedReason = {
      round: 0,
      fixtureId: 0,
      date: 0,
      teams: 0,
    };

    const finishedStatuses = [
      'FT',
      'AET',
      'PEN',
    ];

    for (
      const fixture of
        fixtures
    ) {
      const fixtureId =
        fixture.fixture?.id;

      const fixtureDate =
        fixture.fixture?.date
          ? new Date(
              fixture.fixture.date,
            )
          : null;

      const homeTeamId =
        fixture.teams?.home?.id;

      const awayTeamId =
        fixture.teams?.away?.id;

      const homeScore =
        fixture.goals?.home ??
        null;

      const awayScore =
        fixture.goals?.away ??
        null;

      const status =
        fixture.fixture
          ?.status?.short;

      const finished =
        finishedStatuses.includes(
          status,
        );

      const round =
        String(
          fixture.league?.round ??
            'Regular Season',
        ).trim();

      if (
        !fixtureId
      ) {
        skipped++;
        skippedReason.fixtureId++;
        continue;
      }

      if (
        !fixtureDate ||
        Number.isNaN(
          fixtureDate.getTime(),
        )
      ) {
        skipped++;
        skippedReason.date++;
        continue;
      }

      if (
        !homeTeamId ||
        !awayTeamId
      ) {
        skipped++;
        skippedReason.teams++;
        continue;
      }

      const parsedRound =
        this.parseRound(
          round,
        );

      if (
        parsedRound.type !==
          'REGULAR' ||
        parsedRound.number ===
          null
      ) {
        skipped++;
        skippedReason.round++;
        continue;
      }

      const [
        homeTeam,
        awayTeam,
      ] =
        await Promise.all([
          this.prisma.team.findUnique({
            where: {
              id:
                homeTeamId,
            },
          }),

          this.prisma.team.findUnique({
            where: {
              id:
                awayTeamId,
            },
          }),
        ]);

      if (
        !homeTeam ||
        !awayTeam
      ) {
        skipped++;
        skippedReason.teams++;
        continue;
      }

      let matchday =
        await this.prisma.matchday.findFirst({
          where: {
            leagueId,
            season,
            tournament:
              'Liga MX',

            roundName:
              parsedRound.name,
          },
        });

      if (
        !matchday
      ) {
        matchday =
          await this.prisma.matchday.create({
            data: {
              leagueId,

              number:
                parsedRound.number,

              tournament:
                'Liga MX',

              roundName:
                parsedRound.name,

              season,

              startDate:
                fixtureDate,

              endDate:
                fixtureDate,

              active: false,
            },
          });

        matchdaysCreated++;
      } else {
        const startDate =
          fixtureDate <
          matchday.startDate
            ? fixtureDate
            : matchday.startDate;

        const endDate =
          fixtureDate >
          matchday.endDate
            ? fixtureDate
            : matchday.endDate;

        if (
          startDate.getTime() !==
            matchday.startDate.getTime() ||
          endDate.getTime() !==
            matchday.endDate.getTime()
        ) {
          matchday =
            await this.prisma.matchday.update({
              where: {
                id:
                  matchday.id,
              },

              data: {
                startDate,
                endDate,
              },
            });
        }
      }

      const existingMatch =
        await this.prisma.match.findUnique({
          where: {
            apiId:
              fixtureId,
          },
        });

      const savedMatch =
        await this.prisma.match.upsert({
          where: {
            apiId:
              fixtureId,
          },

          update: {
            date:
              fixtureDate,

            homeScore,
            awayScore,

            finished,

            homeTeamId,
            awayTeamId,

            matchdayId:
              matchday.id,

            leagueId,
          },

          create: {
            apiId:
              fixtureId,

            date:
              fixtureDate,

            homeScore,
            awayScore,

            finished,

            homeTeamId,
            awayTeamId,

            matchdayId:
              matchday.id,

            leagueId,
          },
        });

      if (
        savedMatch.finished &&
        savedMatch.homeScore !==
          null &&
        savedMatch.awayScore !==
          null
      ) {
        await this.scoringService.scoreMatch(
          savedMatch.id,
        );
      }

      if (
        existingMatch
      ) {
        updated++;
      } else {
        imported++;
      }
    }

    return {
      success: true,
      imported,
      updated,
      matchdaysCreated,
      skipped,
      skippedReason,
      total:
        imported +
        updated,

      fixturesReceived:
        fixtures.length,

      leagueId,
      season,
    };
  }

  async updateResults(
    leagueId: number,
    season: number,
  ) {
    /**
     * IMPORTANTE:
     *
     * API-Sports Free no permite consultar
     * Liga MX 2026.
     *
     * Para Liga MX 2026 usamos ESPN.
     */
    if (
      leagueId === 262 &&
      season === 2026
    ) {
      return this.espnFootballService
        .importUpcomingMatches();
    }

    const response =
      await this.client.get(
        '/fixtures',
        {
          league: leagueId,
          season,
        },
      );

    if (
      response.errors &&
      Object.keys(
        response.errors,
      ).length > 0
    ) {
      throw new BadRequestException({
        message:
          'Error al consultar API-Sports.',

        errors:
          response.errors,

        leagueId,
        season,
      });
    }

    const fixtures =
      response.response ?? [];

    if (
      fixtures.length ===
      0
    ) {
      return {
        success: true,
        updated: 0,
        scored: 0,
        ignored: 0,
        total: 0,
        leagueId,
        season,
      };
    }

    const finishedStatuses = [
      'FT',
      'AET',
      'PEN',
    ];

    let updated = 0;
    let scored = 0;
    let ignored = 0;

    for (
      const fixture of
        fixtures
    ) {
      const fixtureId =
        fixture.fixture?.id;

      if (
        !fixtureId
      ) {
        ignored++;
        continue;
      }

      const existingMatch =
        await this.prisma.match.findUnique({
          where: {
            apiId:
              fixtureId,
          },
        });

      if (
        !existingMatch
      ) {
        ignored++;
        continue;
      }

      const homeScore =
        fixture.goals?.home ??
        null;

      const awayScore =
        fixture.goals?.away ??
        null;

      const status =
        fixture.fixture
          ?.status?.short;

      const finished =
        finishedStatuses.includes(
          status,
        );

      const fixtureDate =
        fixture.fixture?.date
          ? new Date(
              fixture.fixture.date,
            )
          : existingMatch.date;

      const match =
        await this.prisma.match.update({
          where: {
            id:
              existingMatch.id,
          },

          data: {
            date:
              fixtureDate,

            homeScore,
            awayScore,
            finished,
          },
        });

      updated++;

      if (
        finished &&
        homeScore !==
          null &&
        awayScore !==
          null
      ) {
        await this.scoringService.scoreMatch(
          match.id,
        );

        scored++;
      }
    }

    return {
      success: true,
      updated,
      scored,
      ignored,
      total:
        fixtures.length,
      leagueId,
      season,
    };
  }

  private parseRound(
    round: string,
  ) {
    if (!round) {
      return {
        type: 'OTHER',
        number: null,
        name: round,
        phase: null,
      };
    }

    const normalized =
      round.trim();

    const regularMatch =
      normalized.match(
        /^(Apertura|Clausura)\s*-\s*(\d+)$/i,
      );

    if (
      regularMatch
    ) {
      const phase =
        regularMatch[1]
          .toLowerCase() ===
        'apertura'
          ? 'APERTURA'
          : 'CLAUSURA';

      return {
        type:
          'REGULAR',

        number:
          Number(
            regularMatch[2],
          ),

        name:
          normalized,

        phase,
      };
    }

    const playoffKeywords = [
      'final',
      'semi-final',
      'semi-finals',
      'semifinal',
      'semifinales',
      'quarter-final',
      'quarter-finals',
      'cuartos',
      'play-off',
      'play-offs',
      'playoff',
      'playoffs',
      'reclasificacion',
      'reclasificación',
    ];

    const lower =
      normalized.toLowerCase();

    if (
      playoffKeywords.some(
        (keyword) =>
          lower.includes(
            keyword,
          ),
      )
    ) {
      return {
        type:
          'PLAYOFF',

        number:
          null,

        name:
          normalized,

        phase:
          null,
      };
    }

    return {
      type:
        'OTHER',

      number:
        null,

      name:
        normalized,

      phase:
        null,
    };
  }

  private getLigaMxTournament(
    fixtureDate: Date,
    season: number,
  ): string {
    if (
      season !==
      2024
    ) {
      throw new BadRequestException(
        `No existe una regla configurada para Liga MX season ${season}`,
      );
    }

    const month =
      fixtureDate.getUTCMonth() +
      1;

    return month >= 7 &&
      month <= 12
      ? 'Apertura'
      : 'Clausura';
  }
}