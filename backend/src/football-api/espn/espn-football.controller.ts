import {
  Controller,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { EspnFootballService } from './espn-football.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('espn')
export class EspnFootballController {
  constructor(
    private readonly espnFootballService: EspnFootballService,
  ) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  syncLigaMx(
    @Query('dates') dates?: string,
  ) {
    return this.espnFootballService.importUpcomingMatches(
      dates,
    );
  }
}