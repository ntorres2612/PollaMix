import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Controller('payments')
export class PaymentsController {

  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Crear pago.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {

    return this.paymentsService.create(
      user.id,
      dto,
    );
  }

  /**
   * Pagos del usuario autenticado.
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyPayments(
    @CurrentUser() user: any,
  ) {

    return this.paymentsService.findMyPayments(
      user.id,
    );
  }

  /**
   * Consultar pago.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {

    return this.paymentsService.findOne(
      Number(id),
      user.id,
    );
  }

  /**
   * Aprobar/rechazar/cancelar pago.
   */
  @Patch(':id/status')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {

    return this.paymentsService.updateStatus(
      Number(id),
      dto,
    );
  }
}