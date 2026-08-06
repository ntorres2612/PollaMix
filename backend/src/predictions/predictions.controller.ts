import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';


import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { ScoringService } from './scoring/scoring.service';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CurrentUser } from '../auth/decorators/current-user.decorator';


@ApiTags('Predictions')
@ApiBearerAuth()
@Controller('predictions')

export class PredictionsController {
  constructor(
    private readonly predictionsService: PredictionsService,
    private readonly scoringService: ScoringService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user,
    @Body() dto: CreatePredictionDto,
  ) {

    dto.userId = user.id;

    return this.predictionsService.create(dto);

  }

  @Get()
  findAll() {
    return this.predictionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.predictionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePredictionDto,
  ) {
    return this.predictionsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.predictionsService.remove(+id);
  }

  @Post('score/:matchId')
  scoreMatch(
    @Param('matchId') matchId: string,
  ) {
    return this.scoringService.scoreMatch(
      Number(matchId),
    );
  }
}