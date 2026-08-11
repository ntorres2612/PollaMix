import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { ScoringService } from './scoring/scoring.service';

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
    @CurrentUser() user: any,
    @Body() dto: CreatePredictionDto,
  ) {
    return this.predictionsService.create(
      user.id,
      dto,
    );
  }

  @Get()
  findAll() {
    return this.predictionsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.predictionsService.findOne(
      Number(id),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePredictionDto,
  ) {
    return this.predictionsService.update(
      Number(id),
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
  ) {
    return this.predictionsService.remove(
      Number(id),
    );
  }

  @Post('score/:matchId')
  @UseGuards(JwtAuthGuard)
  scoreMatch(
    @Param('matchId') matchId: string,
  ) {
    return this.scoringService.scoreMatch(
      Number(matchId),
    );
  }


}