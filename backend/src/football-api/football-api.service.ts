import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';



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
        message: 'No se encontraron partidos para la temporada indicada.',
        leagueId,
        season,
      };
    }

    let imported = 0;


  }
}