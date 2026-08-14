import {
  Controller,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { ScoringService } from './scoring.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('scoring')
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
  ) {}

  @Post(':matchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  scoreMatch(
    @Param('matchId', ParseIntPipe) matchId: number,
  ) {
    return this.scoringService.scoreMatch(matchId);
  }
}