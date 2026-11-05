import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { TournamentParticipantsService } from './tournament-participants.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('tournaments')
export class TournamentParticipantsController {

  constructor(
    private readonly participantsService:
      TournamentParticipantsService,
  ) {}

  // POLLAMIX_PLAYER_CLAIMS_ENDPOINT
  @Post(':tournamentId/claims')
  @UseGuards(JwtAuthGuard)
  createClaim(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: any,
    @Body() body: unknown,
  ) {
    const reason =
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      Object.prototype.hasOwnProperty.call(body, 'reason')
        ? (body as { reason: unknown }).reason
        : undefined;

    return this.participantsService.createClaim(
      Number(tournamentId),
      Number(user.id),
      reason,
    );
  }

  @Post(':tournamentId/join')
  @UseGuards(JwtAuthGuard)
  join(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: any,
  ) {

    return this.participantsService.join(
      Number(tournamentId),
      user.id,
    );
  }

  @Get(':tournamentId/participants')
  @UseGuards(JwtAuthGuard)
  findParticipants(
    @Param('tournamentId') tournamentId: string,
  ) {

    return this.participantsService.findParticipants(
      Number(tournamentId),
    );
  }
}