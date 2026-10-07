import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { FootballApiController } from './football-api.controller';
import { FootballApiService } from './football-api.service';
import { FootballApiClient } from './football-api.client';

import { PredictionsModule } from '../predictions/predictions.module';
import { FootballSyncService } from './jobs/football-sync.service';

import { EspnFootballController } from './espn/espn-football.controller';
import { EspnFootballService } from './espn/espn-football.service';

@Module({
  imports: [
    HttpModule,
    PredictionsModule,
  ],

  providers: [
    FootballApiClient,
    FootballApiService,
    FootballSyncService,
    EspnFootballService,
  ],

  controllers: [
    FootballApiController,
    EspnFootballController,
  ],

  exports: [
    FootballApiClient,
    FootballApiService,
    EspnFootballService,
  ],
})
export class FootballApiModule {}