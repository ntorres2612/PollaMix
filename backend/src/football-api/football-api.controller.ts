import {
    Controller,
    Get,
    Post,
    Param,
} from '@nestjs/common';

import { FootballApiService } from './football-api.service';



@Controller('football')
export class FootballApiController {
    constructor(
        private readonly footballApiService: FootballApiService,
    ) { }

    @Get('leagues')
    getLeagues() {
        return this.footballApiService.getLeagues();
    }

    @Post('import/leagues')
    importLeagues() {
        return this.footballApiService.importLeagues();
    }

    @Post('import/teams/:leagueId/:season')
    importTeams(
        @Param('leagueId') leagueId: string,
        @Param('season') season: string,
    ) {
        return this.footballApiService.importTeams(
            Number(leagueId),
            Number(season),
        );
    }
    @Post('import/matches/:leagueId/:season')

    importMatches(
        @Param('leagueId') leagueId: string,
        @Param('season') season: string,
    ) {
        return this.footballApiService.importMatches(
            Number(leagueId),
            Number(season),
        );
    }

    @Post(
        'update-results/:leagueId/:season',
    )
    updateResults(
        @Param('leagueId') leagueId: string,
        @Param('season') season: string,
    ) {
        return this.footballApiService.updateResults(
            Number(leagueId),
            Number(season),
        );
    }


}