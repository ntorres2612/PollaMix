import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FootballApiService } from '../football-api.service';


@Injectable()
export class FootballSyncService {

  private readonly logger =
    new Logger(FootballSyncService.name);

  constructor(
    private readonly footballApiService: FootballApiService,
  ) {}

  @Cron('*/15 * * * *')
  async updateResults() {

    this.logger.log(
      'Iniciando actualización automática de resultados...',
    );

    try {

      const result =
        await this.footballApiService.updateResults(
          262,
          2024,
        );

      this.logger.log(
        `Resultados actualizados: ${result.updated}`,
      );

      this.logger.log(
        `Partidos puntuados: ${result.scored}`,
      );

    } catch (error) {

      this.logger.error(
        'Error actualizando resultados',
        error instanceof Error
          ? error.stack
          : String(error),
      );

    }
  }
}