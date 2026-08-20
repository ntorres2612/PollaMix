import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';



import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { FootballApiClient } from './football-api.client';
import { ScoringService } from '../predictions/scoring/scoring.service';

@Injectable()
export class FootballApiService {

  constructor(
    private prisma: PrismaService,
    private client: FootballApiClient,
    private scoringService: ScoringService,
  ) { }

  async getLeagues() {

    console.log('=== FootballApiService ===');
    console.log(this.client);

    return {
      ok: true,
    };

  }
  async importLeagues() {

    const data = await this.client.get('/leagues');

    const leagues = data.response;

    let imported = 0;

    for (const item of leagues) {

      await this.prisma.league.upsert({

        where: {
          id: item.league.id,
        },

        update: {

          name: item.league.name,
          type: item.league.type,
          country: item.country.name,
          countryCode: item.country.code,
          logo: item.league.logo,
          season: item.seasons.at(-1)?.year ?? 2026,
          active: true,

        },

        create: {

          id: item.league.id,
          name: item.league.name,
          type: item.league.type,
          country: item.country.name,
          countryCode: item.country.code,
          logo: item.league.logo,
          season: item.seasons.at(-1)?.year ?? 2026,
          active: true,

        }

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

    console.log('==============================');
    console.log('IMPORTANDO EQUIPOS');
    console.log('League:', leagueId);
    console.log('Season:', season);

    const response = await this.client.get('/teams', {
      league: leagueId,
      season,
    });

    console.log('Resultados:', response.results);
    console.log('Errores:', response.errors);
    console.log('Primer equipo:');
    console.dir(response.response[0], { depth: null });

    const teams = response.response ?? [];

    for (const item of teams) {

      await this.prisma.team.upsert({

        where: {
          id: item.team.id,
        },

        update: {
          name: item.team.name,
          shortName:
            item.team.code ??
            item.team.name.substring(0, 3).toUpperCase(),
          logo: item.team.logo,
          leagueId,
        },

        create: {
          id: item.team.id,
          name: item.team.name,
          shortName:
            item.team.code ??
            item.team.name.substring(0, 3).toUpperCase(),
          logo: item.team.logo,
          leagueId,
        },

      });

    }

    console.log(`Equipos importados: ${teams.length}`);

    return {
      success: true,
      imported: teams.length,
    };
  }

  async importMatches(
    leagueId: number,
    season: number,
  ) {
    const response = await this.client.get(
      '/fixtures',
      {
        league: leagueId,
        season,
      },
    );

    console.log('======================================');
    console.log('IMPORT MATCHES');
    console.log('League:', leagueId);
    console.log('Season:', season);
    console.log('API RESULTS:', response.results);
    console.log('API ERRORS:', response.errors);
    console.log(
      'FIXTURES RECIBIDOS:',
      response.response?.length ?? 0,
    );

    if (response.response?.length > 0) {
      console.log(
        'PRIMER FIXTURE:',
        JSON.stringify(
          response.response[0],
          null,
          2,
        ),
      );

      console.log(
        'ROUND PRIMER FIXTURE:',
        response.response[0].league?.round,
      );
    }

    console.log('======================================');

    // Verificar errores reportados por API-Sports
    if (
      response.errors &&
      Object.keys(response.errors).length > 0
    ) {
      throw new BadRequestException({
        message: 'Error al consultar API-Sports.',
        errors: response.errors,
        leagueId,
        season,
      });
    }

    const fixtures = response.response ?? [];

    console.log('========================================');
    console.log('IMPORT MATCHES');
    console.log('League:', leagueId);
    console.log('Season:', season);
    console.log('API RESULTS:', response.results);
    console.log('API ERRORS:', response.errors);
    console.log('FIXTURES:', fixtures.length);

    if (fixtures.length > 0) {
      console.log('PRIMER FIXTURE:');
      console.dir(fixtures[0], { depth: null });
    }

    console.log('========================================');

    let skipped = 0;
    let skippedReason = {
      round: 0,
      fixtureId: 0,
      date: 0,
      teams: 0,
    };

    if (fixtures.length === 0) {
      return {
        success: true,
        imported: 0,
        message:
          'No se encontraron partidos para la temporada indicada.',
        leagueId,
        season,
      };
    }

    let imported = 0;
    let updated = 0;
    let matchdaysCreated = 0;

    /*
     * Estados considerados como partido terminado
     */
    const finishedStatuses = [
      'FT',
      'AET',
      'PEN',
    ];

    for (const fixture of fixtures) {
      const fixtureId = fixture.fixture?.id;

      const fixtureDate =
        fixture.fixture?.date
          ? new Date(fixture.fixture.date)
          : null;

      const homeTeamId =
        fixture.teams?.home?.id;

      const awayTeamId =
        fixture.teams?.away?.id;

      const homeScore =
        fixture.goals?.home ?? null;

      const awayScore =
        fixture.goals?.away ?? null;

      const status =
        fixture.fixture?.status?.short;

      const finished =
        finishedStatuses.includes(status);

      const round =
        String(
          fixture.league?.round ??
          'Regular Season',
        ).trim();

      /* const parsedRound =
         this.parseRound(round);
 
       console.log(
         'ROUND API:',
         round,
         'PARSED:',
         parsedRound,
       );
 
       if (
         parsedRound.type !== 'REGULAR' ||
         parsedRound.number === null
       ) {
         continue;
       }*/

      const parsedRound =
        this.parseRound(round);

      console.log(
        'ROUND API:',
        JSON.stringify(round),
        'PARSED:',
        parsedRound,
      );

      if (
        parsedRound.type !== 'REGULAR' ||
        parsedRound.number === null
      ) {
        skipped++;
        skippedReason.round++;

        console.log(
          'FIXTURE DESCARTADO POR ROUND:',
          {
            fixtureId,
            round,
            parsedRound,
          },
        );

        continue;
      }

      /*
       * Validaciones básicas
      
      if (!fixtureId) {
        continue;
      }

      if (!fixtureDate) {
        continue;
      }

      if (!homeTeamId || !awayTeamId) {
        continue;
      } */
      if (!fixtureId) {
        console.log('DESCARTADO: fixtureId');
        continue;
      }

      if (!fixtureDate) {
        console.log(
          'DESCARTADO: fixtureDate',
          fixture,
        );
        continue;
      }

      if (!homeTeamId || !awayTeamId) {
        console.log(
          'DESCARTADO: equipos',
          {
            fixtureId,
            homeTeamId,
            awayTeamId,
          },
        );
        continue;
      }
      /*
       * Verificar que los equipos existan.
       */
      const [homeTeam, awayTeam] =
        await Promise.all([
          this.prisma.team.findUnique({
            where: {
              id: homeTeamId,
            },
          }),

          this.prisma.team.findUnique({
            where: {
              id: awayTeamId,
            },
          }),
        ]);
      /*
            if (!homeTeam || !awayTeam) {
              console.warn(
                `Partido ${fixtureId} omitido: equipos no encontrados.`,
              );
      
              continue;
            }*/

      if (!homeTeam || !awayTeam) {
        console.warn(
          'PARTIDO DESCARTADO: EQUIPO NO ENCONTRADO',
          {
            fixtureId,
            homeTeamId,
            awayTeamId,
            homeExists: !!homeTeam,
            awayExists: !!awayTeam,
          },
        );

        continue;
      }

      /*
       * Buscar jornada existente.
       */
      let matchday =
        await this.prisma.matchday.findFirst({
          where: {
            leagueId,
            season,
            tournament: 'Liga MX',
            roundName: parsedRound.name,
          },
        });

      /*
       * Crear jornada si no existe.
       */
      if (!matchday) {
        matchday =
          await this.prisma.matchday.create({
            data: {
              leagueId,
              number: parsedRound.number,
              tournament: 'Liga MX',
              roundName: parsedRound.name,
              season,
              startDate: fixtureDate,
              endDate: fixtureDate,
              active: false,
            },
          });

        matchdaysCreated++;
      } else {

        /*
         * Actualizar rango de fechas de la jornada.
         */
        const startDate =
          fixtureDate < matchday.startDate
            ? fixtureDate
            : matchday.startDate;

        const endDate =
          fixtureDate > matchday.endDate
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
                id: matchday.id,
              },
              data: {
                startDate,
                endDate,
              },
            });
        }
      }

      /*
       * Crear o actualizar partido.
       */
      const existingMatch =
        await this.prisma.match.findUnique({
          where: {
            apiId: fixtureId,
          },
        });
      const savedMatch =
        await this.prisma.match.upsert({
          where: {
            apiId: fixtureId,
          },

          update: {
            date: fixtureDate,
            homeScore,
            awayScore,
            finished,
            homeTeamId,
            awayTeamId,
            matchdayId: matchday.id,
            leagueId,
          },

          create: {
            apiId: fixtureId,
            date: fixtureDate,
            homeScore,
            awayScore,
            finished,
            homeTeamId,
            awayTeamId,
            matchdayId: matchday.id,
            leagueId,
          },
        });

      if (
        savedMatch.finished &&
        savedMatch.homeScore !== null &&
        savedMatch.awayScore !== null
      ) {
        await this.scoringService.scoreMatch(
          savedMatch.id,
        );
      }

      if (existingMatch) {
        updated++;
      } else {
        imported++;
      }
    }
    /*
        return {
          success: true,
          imported,
          updated,
          matchdaysCreated,
          total: imported + updated,
          leagueId,
          season,
        };
      }*/

    return {
      success: true,
      imported,
      updated,
      matchdaysCreated,
      skipped,
      skippedReason,
      total: imported + updated,
      fixturesReceived: fixtures.length,
      leagueId,
      season,
    };
  }

  async updateResults(
    leagueId: number,
    season: number,
  ) {
    const response = await this.client.get(
      '/fixtures',
      {
        league: leagueId,
        season,
      },
    );

    if (
      response.errors &&
      Object.keys(response.errors).length > 0
    ) {
      throw new BadRequestException({
        message: 'Error al consultar API-Sports.',
        errors: response.errors,
        leagueId,
        season,
      });
    }

    console.log('======================================');
    console.log('API-Sports /fixtures');
    console.log('League:', leagueId);
    console.log('Season:', season);
    console.log('Results:', response.results);
    console.log('Errors:', response.errors);
    console.log('Response length:', response.response?.length);
    console.log('======================================');

    const fixtures = response.response ?? [];

    console.log('==============================');
    console.log('IMPORT MATCHES DEBUG');
    console.log('League:', leagueId);
    console.log('Season:', season);
    console.log('API results:', response.results);
    console.log('API errors:', response.errors);
    console.log('Fixtures recibidos:', fixtures.length);

    if (fixtures.length > 0) {
      console.log('Primer fixture:');
      console.dir(fixtures[0], { depth: null });
    }

    console.log('==============================');

    if (fixtures.length === 0) {
      return {
        success: true,
        updated: 0,
        scored: 0,
        message:
          'No se encontraron partidos.',
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

    for (const fixture of fixtures) {
      const fixtureId =
        fixture.fixture?.id;

      if (!fixtureId) {
        ignored++;
        continue;
      }

      const existingMatch =
        await this.prisma.match.findUnique({
          where: {
            apiId: fixtureId,
          },
        });

      if (!existingMatch) {
        ignored++;
        continue;
      }

      const homeScore =
        fixture.goals?.home ?? null;

      const awayScore =
        fixture.goals?.away ?? null;

      const status =
        fixture.fixture?.status?.short;

      const finished =
        finishedStatuses.includes(status);

      const fixtureDate =
        fixture.fixture?.date
          ? new Date(
            fixture.fixture.date,
          )
          : existingMatch.date;

      const match =
        await this.prisma.match.update({
          where: {
            id: existingMatch.id,
          },

          data: {
            date: fixtureDate,
            homeScore,
            awayScore,
            finished,
          },
        });

      updated++;

      if (
        finished &&
        homeScore !== null &&
        awayScore !== null
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
      total: fixtures.length,
      leagueId,
      season,
    };
  }

  private parseRound(round: string) {
    if (!round) {
      return {
        type: 'OTHER',
        number: null,
        name: round,
        phase: null,
      };
    }

    const normalized = round.trim();

    /**
     * FORMATO API:
     * Apertura - 1
     * Apertura - 2
     * ...
     * Clausura - 1
     * Clausura - 2
     * ...
     */
    const regularMatch = normalized.match(
      /^(Apertura|Clausura)\s*-\s*(\d+)$/i,
    );

    if (regularMatch) {
      const phase =
        regularMatch[1].toLowerCase() === 'apertura'
          ? 'APERTURA'
          : 'CLAUSURA';

      const number = Number(regularMatch[2]);

      return {
        type: 'REGULAR',
        number,
        name: normalized,
        phase,
      };
    }

    /**
     * PLAYOFFS
     */
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

    const lower = normalized.toLowerCase();

    if (
      playoffKeywords.some((keyword) =>
        lower.includes(keyword),
      )
    ) {
      return {
        type: 'PLAYOFF',
        number: null,
        name: normalized,
        phase: null,
      };
    }

    return {
      type: 'OTHER',
      number: null,
      name: normalized,
      phase: null,
    };
  }

  private getLigaMxTournament(
    fixtureDate: Date,
    season: number,
  ): string {
    if (season !== 2024) {
      throw new BadRequestException(
        `No existe una regla configurada para Liga MX season ${season}`,
      );
    }

    const month = fixtureDate.getUTCMonth() + 1;

    if (month >= 7 && month <= 12) {
      return 'Apertura';
    }

    return 'Clausura';
  }
}