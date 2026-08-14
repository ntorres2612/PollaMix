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
        fixture.league?.round ?? 'Regular Season';

      /*
       * Obtener número de jornada.
       *
       * Ejemplos:
       * "Regular Season - 1"  -> 1
       * "Regular Season - 18" -> 18
       */
      const roundMatch =
        String(round).match(/(\d+)$/);

      const matchdayNumber =
        roundMatch
          ? Number(roundMatch[1])
          : 1;

      /*
       * Validaciones básicas
       */
      if (!fixtureId) {
        continue;
      }

      if (!fixtureDate) {
        continue;
      }

      if (!homeTeamId || !awayTeamId) {
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

      if (!homeTeam || !awayTeam) {
        console.warn(
          `Partido ${fixtureId} omitido: equipos no encontrados.`,
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
            number: matchdayNumber,
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
              number: matchdayNumber,
              tournament: String(round),
              season,
              startDate: fixtureDate,
              endDate: fixtureDate,
              active: true,
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

    return {
      success: true,
      imported,
      updated,
      matchdaysCreated,
      total: imported + updated,
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

    const fixtures = response.response ?? [];

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
}