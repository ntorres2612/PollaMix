import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { IncomingTransfersService } from './incoming-transfers.service';
import { GmailMailboxService } from './gmail-mailbox.service';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
  ],

  controllers: [
    PaymentsController,
  ],

  providers: [
    PaymentsService,
    IncomingTransfersService,
    GmailMailboxService,
  ],

  exports: [
    PaymentsService,
  ],
})
export class PaymentsModule {}