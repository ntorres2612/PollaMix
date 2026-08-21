import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { MatchdaysService } from './matchdays.service';
import { CreateMatchdayDto } from './dto/create-matchday.dto';
import { UpdateMatchdayDto } from './dto/update-matchday.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('matchdays')
export class MatchdaysController {
  constructor(private readonly matchdaysService: MatchdaysService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createMatchdayDto: CreateMatchdayDto) {
    return this.matchdaysService.create(createMatchdayDto);
  }

  @Get()
  findAll() {
    return this.matchdaysService.findAll();
  }

  @Get('league/:leagueId/season/:season')
  findByLeagueAndSeason(
    @Param('leagueId') leagueId: string,
    @Param('season') season: string,
  ) {
    return this.matchdaysService.findByLeagueAndSeason(
      Number(leagueId),
      Number(season),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchdaysService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateMatchdayDto: UpdateMatchdayDto,
  ) {
    return this.matchdaysService.update(+id, updateMatchdayDto);
  }


  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.matchdaysService.remove(+id);
  }
}
