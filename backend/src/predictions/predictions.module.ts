import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { ScoringService } from './scoring/scoring.service';
import { PrismaModule } from '../prisma/prisma.module';

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
    ScoringService,
  ],
})
export class PredictionsModule {}