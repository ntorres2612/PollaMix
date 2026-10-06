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

import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly predictionsService: PredictionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER')
  findAll(
    @CurrentUser() user: any,
  ) {
    return this.predictionsService.findAll(
      user.id,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER')
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.predictionsService.findOne(
      Number(id),
      user.id,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePredictionDto,
  ) {
    return this.predictionsService.update(
      Number(id),
      user.id,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER')
  remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.predictionsService.remove(
      Number(id),
      user.id,
    );
  }
}