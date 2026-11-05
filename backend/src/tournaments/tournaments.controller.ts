import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TournamentsService } from './tournaments.service';
import { PrizeClosureService } from './prizes/prize-closure.service';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { SelectTournamentMatchesDto } from './dto/select-tournament-matches.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly prizeClosureService: PrizeClosureService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get('home-stats')
  getHomeStats() {
    return this.tournamentsService.getHomeStats();
  }

  @Get('current')
  getCurrent() {
    return this.tournamentsService.getCurrent();
  }

  // Historial propio de Pollas, incluidas las finalizadas.
  @Get('my-history')
  @UseGuards(JwtAuthGuard)
  getMyHistory(@Req() req: any) {
    return this.tournamentsService.getMyTournamentHistory(
      Number(req.user.id),
    );
  }

  @Get('my-current')
  @UseGuards(JwtAuthGuard)
  getMyCurrent(@Req() req: any) {
    return this.tournamentsService.getCurrentForUser(Number(req.user.id));
  }

  @Get(':id/ranking')
  getRanking(@Param('id') id: string) {
    return this.tournamentsService.getRanking(Number(id));
  }

  // POLLAMIX_PUBLISH_RESULTS_ENDPOINT
  @Post(':id/publish-results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  publishResults(@Param('id') id: string) {
    return this.prizeClosureService.publishResults(Number(id));
  }

  // POLLAMIX_ADMIN_CLAIMS_ENDPOINTS
  @Get(':id/claims')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listClaims(@Param('id') id: string) {
    return this.prizeClosureService.listClaims(Number(id));
  }

  @Patch(':id/claims/:claimId/decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  decideClaim(
    @Param('id') id: string,
    @Param('claimId') claimId: string,
    @Body() body: unknown,
  ) {
    const data =
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body)
        ? body as Record<string, unknown>
        : {};

    return this.prizeClosureService.decideClaim(
      Number(id),
      Number(claimId),
      data.status,
      data.decision,
    );
  }

  // POLLAMIX_OFFICIAL_CORRECTION_ENDPOINT
  @Post(':id/claims/:claimId/apply-correction')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  applyClaimCorrection(
    @Param('id') id: string,
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Body() body: unknown,
  ) {
    const data =
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body)
        ? body as Record<string, unknown>
        : {};

    return this.prizeClosureService.applyClaimCorrection(
      Number(id),
      Number(claimId),
      Number(req.user.id),
      Number(data.matchId),
      data.homeScore as number,
      data.awayScore as number,
      data.reason,
      data.officialResultVerified,
    );
  }

  @Post(':id/close-prizes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  closePrizes(@Param('id') id: string) {
    if (process.env.POLLAMIX_ENABLE_PRIZE_CLOSURE !== 'true') {
      throw new ForbiddenException(
        'El cierre definitivo aún no está habilitado.',
      );
    }
    return this.prizeClosureService.closeTournament(Number(id));
  }

  @Get('prizes/history')
  getPrizeHistory() {
    return this.tournamentsService.getPrizeHistory();
  }

  @Get(':id/winners/contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getWinnerContacts(@Param('id') id: string) {
    return this.tournamentsService.getWinnerContacts(Number(id));
  }

  @Get(':id/prizes/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getPrizesAdmin(@Param('id') id: string) {
    return this.tournamentsService.getPrizes(Number(id));
  }

  @Get(':id/prizes')
  async getPrizes(@Param('id') id: string) {
    const data = await this.tournamentsService.getPrizes(Number(id));

    // Contrato público: nunca devolver recaudación,
    // utilidad, cantidad de pagos ni contabilidad.
    return {
      tournamentId: data.tournamentId,
      published: data.published,
      finalized: data.finalized === true,
      closedAt: data.finalized === true ? data.closedAt : null,
      currency: data.currency,
      prizes: data.prizes,
      message: data.message,
    };
  }

  @Get(':id/my-status')
  @UseGuards(JwtAuthGuard)
  getMyStatus(@Param('id') id: string, @Req() req: any) {
    return this.tournamentsService.getMyStatus(Number(id), Number(req.user.id));
  }

  @Get(':id/available-matches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAvailableMatches(@Param('id') id: string) {
    return this.tournamentsService.getAvailableMatches(Number(id));
  }

  @Put(':id/selected-matches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  selectMatches(@Param('id') id: string, @Body() dto: SelectTournamentMatchesDto) {
    return this.tournamentsService.selectMatches(Number(id), dto.matchIds);
  }

  @Get(':id/matches')
  getSelectedMatches(@Param('id') id: string) {
    return this.tournamentsService.getSelectedMatches(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournamentsService.update(Number(id), dto);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deactivate(@Param('id') id: string) {
    return this.tournamentsService.deactivate(Number(id));
  }
}
