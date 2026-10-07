import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { FootballApiService } from './football-api.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('football')
export class FootballApiController {

  constructor(
    private readonly footballApiService: FootballApiService,
  ) {}

  @Get('leagues')
  getLeagues() {
    return this.footballApiService.getLeagues();
  }

  @Post('import/leagues')
  importLeagues() {
    return this.footballApiService.importLeagues();
  }

  @Post('import/teams/:leagueId/:season')
  importTeams(
    @Param('leagueId') leagueId: string,
    @Param('season') season: string,
  ) {
    return this.footballApiService.importTeams(
      Number(leagueId),
      Number(season),
    );
  }

  @Post('import/matches/:leagueId/:season')
  importMatches(
    @Param('leagueId') leagueId: string,
    @Param('season') season: string,
  ) {
    return this.footballApiService.importMatches(
      Number(leagueId),
      Number(season),
    );
  }

  /**
   * Actualiza resultados desde API-Sports
   * y ejecuta scoring para partidos finalizados.
   *
   * Solo ADMIN.
   */
  @Post(
    'update-results/:leagueId/:season',
  )
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('ADMIN')
  updateResults(
    @Param('leagueId') leagueId: string,
    @Param('season') season: string,
  ) {
    return this.footballApiService.updateResults(
      Number(leagueId),
      Number(season),
    );
  }
}