import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TournamentsService } from './tournaments.service';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { SelectTournamentMatchesDto } from './dto/select-tournament-matches.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get('current')
  getCurrent() {
    return this.tournamentsService.getCurrent();
  }

  @Get('my-current')
  @UseGuards(JwtAuthGuard)
  getMyCurrent(@Req() req: any) {
    return this.tournamentsService.getCurrentForUser(Number(req.user.id));
  }

  @Get(':id/ranking')
  getRanking(@Param('id') id: string) {
    return this.tournamentsService.getRanking(Number(id));
  }

  @Get(':id/prizes')
  getPrizes(@Param('id') id: string) {
    return this.tournamentsService.getPrizes(Number(id));
  }

  @Get(':id/my-status')
  @UseGuards(JwtAuthGuard)
  getMyStatus(@Param('id') id: string, @Req() req: any) {
    return this.tournamentsService.getMyStatus(Number(id), Number(req.user.id));
  }

  @Get(':id/available-matches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAvailableMatches(@Param('id') id: string) {
    return this.tournamentsService.getAvailableMatches(Number(id));
  }

  @Put(':id/selected-matches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  selectMatches(@Param('id') id: string, @Body() dto: SelectTournamentMatchesDto) {
    return this.tournamentsService.selectMatches(Number(id), dto.matchIds);
  }

  @Get(':id/matches')
  getSelectedMatches(@Param('id') id: string) {
    return this.tournamentsService.getSelectedMatches(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournamentsService.update(Number(id), dto);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deactivate(@Param('id') id: string) {
    return this.tournamentsService.deactivate(Number(id));
  }
}
