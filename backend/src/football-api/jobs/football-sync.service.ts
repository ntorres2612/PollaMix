import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FootballApiService } from '../football-api.service';
import { EspnFootballService } from '../espn/espn-football.service';

@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(
    FootballSyncService.name,
  );

  constructor(
    private readonly footballApiService: FootballApiService,
    private readonly espnFootballService: EspnFootballService,
  ) {}

  /**
   * Sincronización automática cada 15 minutos.
   *
   * Mantiene:
   * - API-Football 2024 para compatibilidad con
   *   datos históricos/pruebas existentes.
   * - ESPN 2026 para la PollaMix actual.
   */
  @Cron('*/15 * * * *')
  async updateResults() {
    this.logger.log(
      '========================================',
    );

    this.logger.log(
      'Iniciando actualización automática de resultados...',
    );

    this.logger.log(
      '========================================',
    );

    // --------------------------------------------------
    // 1. API-FOOTBALL 2024
    // --------------------------------------------------

    try {
      const result =
        await this.footballApiService.updateResults(
          262,
          2024,
        );

      this.logger.log(
        `API-Football 2024 → actualizados: ${result.updated}`,
      );

      this.logger.log(
        `API-Football 2024 → puntuados: ${result.scored}`,
      );

      /**
       * updateResults() tiene diferentes respuestas
       * dependiendo de la fuente utilizada.
       *
       * API-Football devuelve "ignored".
       * ESPN devuelve "skipped".
       */
      const ignored =
        'ignored' in result
          ? result.ignored
          : result.skipped;

      this.logger.log(
        `API-Football 2024 → ignorados/omitidos: ${ignored}`,
      );
    } catch (error) {
      this.logger.error(
        'Error actualizando resultados API-Football 2024',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }

    // --------------------------------------------------
    // 2. ESPN 2026
    // --------------------------------------------------

    try {
      const dates = this.getRecentDateRange();

      this.logger.log(
        `ESPN Liga MX 2026 → consultando fechas: ${dates}`,
      );

      const result =
        await this.espnFootballService.importUpcomingMatches(
          dates,
        );

      this.logger.log(
        `ESPN 2026 → eventos recibidos: ${result.eventsReceived}`,
      );

      this.logger.log(
        `ESPN 2026 → partidos actualizados: ${result.updated}`,
      );

      this.logger.log(
        `ESPN 2026 → partidos omitidos: ${result.skipped}`,
      );

      this.logger.log(
        `ESPN 2026 → partidos puntuados: ${result.scored}`,
      );

      this.logger.log(
        `ESPN 2026 → pronósticos puntuados: ${result.predictionsScored}`,
      );

      this.logger.log(
        'ESPN 2026 → sincronización y scoring completados.',
      );
    } catch (error) {
      this.logger.error(
        'Error actualizando resultados ESPN 2026',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }

  /**
   * Obtiene ayer + hoy en formato ESPN:
   *
   * YYYYMMDD-YYYYMMDD
   *
   * Consultar dos días permite capturar partidos
   * finalizados recientemente incluso si una ejecución
   * anterior no estuvo disponible.
   */
  private getRecentDateRange(): string {
    const now = new Date();

    const yesterday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 1,
      ),
    );

    const today = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ),
    );

    return `${this.formatDate(yesterday)}-${this.formatDate(
      today,
    )}`;
  }

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();

    const month = String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      date.getUTCDate(),
    ).padStart(2, '0');

    return `${year}${month}${day}`;
  }
}