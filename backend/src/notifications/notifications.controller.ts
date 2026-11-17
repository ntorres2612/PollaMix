import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: { user: { id: number } }) {
    return this.notifications.list(Number(req.user.id));
  }

  @Post(':id/read')
  markRead(
    @Param('id') id: string,
    @Req() req: { user: { id: number } },
  ) {
    return this.notifications.markRead(Number(req.user.id), Number(id));
  }
}
