import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { FootballApiController } from './football-api.controller';
import { FootballApiService } from './football-api.service';
import { FootballApiClient } from './football-api.client';

@Module({
  imports: [
    HttpModule,
  ],

  providers: [
    FootballApiClient,
    FootballApiService,
  ],

  controllers: [
    FootballApiController,
  ],

  exports: [
    FootballApiClient,
    FootballApiService,
  ],
})
export class FootballApiModule {}