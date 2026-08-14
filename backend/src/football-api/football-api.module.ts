import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { FootballApiController } from './football-api.controller';
import { FootballApiService } from './football-api.service';
import { FootballApiClient } from './football-api.client';

import { PredictionsModule } from '../predictions/predictions.module';
import { FootballSyncService } from './jobs/football-sync.service';

@Module({
  imports: [
    HttpModule,
    PredictionsModule,
  ],

  providers: [
    FootballApiClient,
    FootballApiService,
    FootballSyncService,
  ],

  controllers: [
    FootballApiController,
  ],

  exports: [
    FootballApiClient,
    FootballApiService,

  ],
})
export class FootballApiModule { }