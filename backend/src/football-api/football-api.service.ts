import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { FootballApiClient } from './football-api.client';

@Injectable()
export class FootballApiService {

  constructor(

    private prisma: PrismaService,

    private client: FootballApiClient,

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

  const fixtures = response.response;

  let imported = 0;

  for (const item of fixtures) {

    //------------------------
    // Jornada
    //------------------------

    const round = item.league.round;

    const number =
      parseInt(round.match(/\d+/)?.[0] ?? '0');

    //------------------------
    // Buscar jornada
    //------------------------

    let matchday =
      await this.prisma.matchday.findFirst({

        where: {

          leagueId,

          number,

        },

      });

    //------------------------
    // Crear jornada
    //------------------------

    if (!matchday) {

      matchday =
        await this.prisma.matchday.create({

          data: {

            leagueId,

            number,

            tournament: item.league.name,

            season,

            startDate: new Date(item.fixture.date),

            endDate: new Date(item.fixture.date),

            active: false,

          },

        });

    }

    //------------------------
    // Guardar partido
    //------------------------

    await this.prisma.match.upsert({

      where: {

        apiId: item.fixture.id,

      },

      update: {

        date: new Date(item.fixture.date),

        homeScore: item.goals.home,

        awayScore: item.goals.away,

        finished:
          item.fixture.status.short === 'FT',

        matchdayId: matchday.id,

      },

      create: {

        apiId: item.fixture.id,

        leagueId,

        matchdayId: matchday.id,

        homeTeamId: item.teams.home.id,

        awayTeamId: item.teams.away.id,

        date: new Date(item.fixture.date),

        homeScore: item.goals.home,

        awayScore: item.goals.away,

        finished:
          item.fixture.status.short === 'FT',

      },

    });

    imported++;

  }

  return {

    success: true,

    imported,

  };

}

}