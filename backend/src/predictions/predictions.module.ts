import { Module } from '@nestjs/common';

import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

import { PrismaModule } from '../prisma/prisma.module';

import { ScoringController } from './scoring/scoring.controller';
import { ScoringService } from './scoring/scoring.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    PredictionsController,
  ],

  providers: [
    PredictionsService,
    ScoringService,
  ],

  exports: [
    PredictionsService,
    ScoringService,
  ],
})
export class PredictionsModule {}












