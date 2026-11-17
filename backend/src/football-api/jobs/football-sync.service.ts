import { Injectable, Logger } from '@nestjs/common';

import { FootballApiService } from '../football-api.service';

@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(
    FootballSyncService.name,
  );

  constructor(
    private readonly footballApiService: FootballApiService,
  ) {}

  /**
   * Actualiza Liga MX 2024 desde API-Sports.
   * Las Pollas activas se sincronizan en el cron de FootballApiService.
   */
  async updateResults() {
    this.logger.log(
      'Iniciando actualización de resultados API-Sports...',
    );

    try {
      const result =
        await this.footballApiService.updateResults(
          262,
          2024,
        );

      this.logger.log(
        `API-Sports 2024 → actualizados: ${result.updated}`,
      );

      this.logger.log(
        `API-Sports 2024 → puntuados: ${result.scored}`,
      );

      this.logger.log(
        `API-Sports 2024 → ignorados: ${result.ignored}`,
      );
    } catch (error) {
      this.logger.error(
        'Error actualizando resultados API-Sports 2024',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }
}
