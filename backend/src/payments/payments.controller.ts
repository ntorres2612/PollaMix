import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { PaymentsService } from './payments.service';
import { IncomingTransfersService } from './incoming-transfers.service';
import { GmailMailboxService } from './gmail-mailbox.service';

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
    private readonly incoming: IncomingTransfersService,
    private readonly mailbox: GmailMailboxService,
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

  @Get('mailbox')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  mailboxStatus() {
    return this.mailbox.status();
  }

  @Get('mailbox/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  mailboxConnect(@CurrentUser() user: { id: number }) {
    return this.mailbox.connectUrl(user.id);
  }

  @Get('mailbox/callback')
  async mailboxCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const target = await this.mailbox.finishConnect({
      code: code ?? '',
      state: state ?? '',
      error: error ?? '',
    });
    response.redirect(target);
  }

  @Post('mailbox/credentials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  mailboxCredentials(
    @Body() body: { clientId?: string; clientSecret?: string },
  ) {
    return this.mailbox.saveCredentials(
      body?.clientId ?? '',
      body?.clientSecret ?? '',
    );
  }

  @Post('mailbox/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  mailboxSync() {
    return this.mailbox.sync();
  }

  @Delete('mailbox')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  mailboxDisconnect() {
    return this.mailbox.disconnect();
  }

  @Get('incoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  incomingTransfers() {
    return this.incoming.list();
  }

  @Post('incoming/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  assignIncoming(
    @Param('id') id: string,
    @Body() body: { paymentId?: number },
  ) {
    return this.incoming.assign(Number(id), Number(body?.paymentId));
  }

  /**
   * Pagos de un torneo.
   *
   * Uso exclusivo de administradores.
   */
  @Get('tournament/:tournamentId')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('ADMIN')
  findByTournament(
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.paymentsService.findByTournament(
      Number(tournamentId),
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