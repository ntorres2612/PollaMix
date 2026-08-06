import { Module } from '@nestjs/common';
import { TeamsModule } from './teams/teams.module';
import { PrismaModule } from './prisma/prisma.module';
import { MatchdaysModule } from './matchdays/matchdays.module';
import { MatchesModule } from './matches/matches.module';
import { PredictionsModule } from './predictions/predictions.module';
import { FootballApiModule } from './football-api/football-api.module';


@Module({
  imports: [

  

    PrismaModule,

    FootballApiModule,

  

    TeamsModule,

    MatchdaysModule,

    MatchesModule,

    PredictionsModule,

  ],
})
export class AppModule { }