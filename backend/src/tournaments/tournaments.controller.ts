import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { TournamentsService } from './tournaments.service';

import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JoinTournamentDto } from './dto/join-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
    constructor(
        private readonly tournamentsService: TournamentsService,
    ) { }

    @Post()
    create(
        @Body() dto: CreateTournamentDto,
    ) {
        return this.tournamentsService.create(dto);
    }

    @Get()
    findAll() {
        return this.tournamentsService.findAll();
    }

    @Post(':id/join')
    @UseGuards(JwtAuthGuard)
    join(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.tournamentsService.join(
            Number(id),
            user.id,
        );
    }

    @Get(':id/matches')
    getMatches(
        @Param('id') id: string,
    ) {
        return this.tournamentsService.getMatches(
            Number(id),
        );
    }

    @Get(':id/ranking')
    getRanking(
        @Param('id') id: string,
    ) {
        return this.tournamentsService.getRanking(
            Number(id),
        );
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
    ) {
        return this.tournamentsService.findOne(
            Number(id),
        );
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: any,
    ) {
        return this.tournamentsService.update(
            Number(id),
            dto,
        );
    }

    @Patch(':id/deactivate')
    deactivate(
        @Param('id') id: string,
    ) {
        return this.tournamentsService.deactivate(
            Number(id),
        );
    }
}