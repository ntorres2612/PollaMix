
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
import { SubmitPredictionsDto } from './dto/submit-predictions.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly predictionsService: PredictionsService,
  ) {}

  // Confirmar los 10 pronósticos definitivamente
  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER')
  submit(
    @CurrentUser() user: any,
    @Body() dto: SubmitPredictionsDto,
  ) {
    return this.predictionsService.submit(
      user.id,
      dto,
    );
  }

  // Crear pronóstico individual (endpoint existente)
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

  // Consultar pronósticos propios
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER', 'ADMIN')
  findAll(
    @CurrentUser() user: any,
  ) {
    return this.predictionsService.findAll(
      user.id,
    );
  }

  // Consultar un pronóstico propio
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLAYER', 'ADMIN')
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.predictionsService.findOne(
      Number(id),
      user.id,
    );
  }

  // Actualizar pronóstico individual (endpoint existente)
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

  // Eliminar pronóstico individual (endpoint existente)
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
