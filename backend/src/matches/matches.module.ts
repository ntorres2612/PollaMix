import { Module } from '@nestjs/common';
import { PredictionsModule } from '../predictions/predictions.module';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';

@Module({
  imports: [PredictionsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
