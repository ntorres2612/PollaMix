import { Module } from '@nestjs/common';

import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

import { TournamentParticipantsController } from './participants/tournament-participants.controller';
import { TournamentParticipantsService } from './participants/tournament-participants.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    TournamentsController,
    TournamentParticipantsController,
  ],
  providers: [
    TournamentsService,
    TournamentParticipantsService,
  ],
})
export class TournamentsModule {}