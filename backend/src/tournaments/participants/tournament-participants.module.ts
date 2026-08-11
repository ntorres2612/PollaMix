import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { TournamentParticipantsController } from './tournament-participants.controller';

import { TournamentParticipantsService } from './tournament-participants.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    TournamentParticipantsController,
  ],

  providers: [
    TournamentParticipantsService,
  ],

  exports: [
    TournamentParticipantsService,
  ],
})
export class TournamentParticipantsModule {}