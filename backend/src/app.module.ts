import { Module } from '@nestjs/common';
import { TeamsModule } from './teams/teams.module';
import { PrismaModule } from './prisma/prisma.module';
import { MatchdaysModule } from './matchdays/matchdays.module';
import { MatchesModule } from './matches/matches.module';
import { PredictionsModule } from './predictions/predictions.module';
import { FootballApiModule } from './football-api/football-api.module';
import { RankingService } from './ranking/ranking.service';
import { RankingModule } from './ranking/ranking.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { TournamentsModule } from './tournaments/tournaments.module';
import { PaymentsModule } from './payments/payments.module';


@Module({
  imports: [
    PrismaModule,
    TeamsModule,
    MatchdaysModule,
    MatchesModule,
    PredictionsModule,
    FootballApiModule,
    RankingModule,
    DashboardModule,
    AuthModule,
    TournamentsModule,
    PaymentsModule,
  ],
})
export class AppModule {}