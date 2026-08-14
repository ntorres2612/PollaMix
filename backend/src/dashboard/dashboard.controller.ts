import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { DashboardService } from './dashboard.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {

  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getDashboard(
    @CurrentUser() user: any,
  ) {
    return this.dashboardService.getDashboard(
      user.id,
    );
  }
}