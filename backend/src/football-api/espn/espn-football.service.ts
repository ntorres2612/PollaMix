import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';

import { ScoringService } from '../../predictions/scoring/scoring.service';

@Injectable()
export class EspnFootballService {
  private readonly logger =
    new Logger(EspnFootballService.name);

  private readonly leagueId = 262;
  private readonly season = 2026;

  /**
   * Mapeo:
   *
   * ESPN team ID -> Team.id interno de PollaMix
   */
  private readonly teamMap: Record<number, number> = {
    219: 2278, // Guadalajara
    232: 2279, // Tigres UANL
    10125: 2280, // Tijuana
    223: 2281, // Toluca
    220: 2282, // Monterrey
    216: 2283, // Atlas
    225: 2285, // Santos
    233: 2286, // Pumas UNAM
    227: 2287, // América
    229: 2288, // Necaxa
    228: 2289, // León
    222: 2290, // Querétaro
    231: 2291, // Puebla
    234: 2292, // Pachuca
    218: 2295, // Cruz Azul
    15720: 2296, // Atlético de San Luis
    17851: 2298, // FC Juarez
    226: 2299, // Atlante
  };

  /**
   * Calendario oficial del Apertura 2026.
   *
   * Las fechas corresponden al calendario local
   * de Liga MX.
   *
   * ESPN no entrega correctamente "week" en los
   * eventos del scoreboard que estamos utilizando,
   * por lo que PollaMix determina la jornada a
   * partir de la fecha local del partido.
   */
  private readonly regularSeasonRounds = [
    {
      number: 1,
      start: '2026-07-16',
      end: '2026-07-18',
    },
    {
      number: 2,
      start: '2026-07-21',
      end: '2026-07-26',
    },
    {
      number: 3,
      start: '2026-07-31',
      end: '2026-08-02',
    },
    {
      number: 4,
      start: '2026-08-15',
      end: '2026-08-17',
    },
    {
      number: 5,
      start: '2026-08-21',
      end: '2026-08-23',
    },
    {
      number: 6,
      start: '2026-08-28',
      end: '2026-08-30',
    },
    {
      number: 7,
      start: '2026-09-04',
      end: '2026-09-06',
    },
    {
      number: 8,
      start: '2026-09-11',
      end: '2026-09-13',
    },
    {
      number: 9,
      start: '2026-09-18',
      end: '2026-09-20',
    },
    {
      number: 10,
      start: '2026-09-25',
      end: '2026-09-27',
    },
    {
      number: 11,
      start: '2026-10-09',
      end: '2026-10-11',
    },
    {
      number: 12,
      start: '2026-10-16',
      end: '2026-10-18',
    },
    {
      number: 13,
      start: '2026-10-20',
      end: '2026-10-21',
    },
    {
      number: 14,
      start: '2026-10-23',
      end: '2026-10-25',
    },
    {
      number: 15,
      start: '2026-10-30',
      end: '2026-11-01',
    },
    {
      number: 16,
      start: '2026-11-06',
      end: '2026-11-08',
    },
    {
      number: 17,
      start: '2026-11-20',
      end: '2026-11-22',
    },
  ];

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Consulta el scoreboard de Liga MX en ESPN.
   *
   * ESPN funciona correctamente con una fecha individual
   * YYYYMMDD.
   *
   * Cuando recibimos un rango, hacemos una consulta
   * individual por cada día y luego combinamos los eventos.
   */
  async getLigaMxScoreboard(
    dates?: string,
  ) {
    const baseUrl =
      'https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard';

    if (dates?.includes('-')) {
      const [startValue, endValue] =
        dates.split('-');

      const start =
        this.parseDateValue(startValue);

      const end =
        this.parseDateValue(endValue);

      if (
        !start ||
        !end ||
        start > end
      ) {
        throw new Error(
          `Rango de fechas ESPN inválido: ${dates}`,
        );
      }

      const dateValues: string[] = [];

      const current = new Date(start);

      while (current <= end) {
        dateValues.push(
          this.formatDateValue(current),
        );

        current.setUTCDate(
          current.getUTCDate() + 1,
        );
      }

      const responses =
        await Promise.all(
          dateValues.map(
            async (date) => {
              this.logger.log(
                `Consultando ESPN para fecha: ${date}`,
              );

              const response =
                await firstValueFrom(
                  this.http.get(baseUrl, {
                    params: {
                      dates: date,
                    },
                  }),
                );

              return response.data;
            },
          ),
        );

      const events =
        responses.flatMap(
          (data) =>
            data.events ?? [],
        );

      const uniqueEvents =
        Array.from(
          new Map(
            events.map(
              (event: any) => [
                String(event.id),
                event,
              ],
            ),
          ).values(),
        );

      return {
        ...(responses[0] ?? {}),
        events: uniqueEvents,
      };
    }

    const response =
      await firstValueFrom(
        this.http.get(baseUrl, {
          params: dates
            ? { dates }
            : {},
        }),
      );

    return response.data;
  }

  /**
   * Importa y sincroniza partidos ESPN.
   *
   * Reglas:
   *
   * 1. Si existe Match por apiId ESPN:
   *    se actualiza.
   *
   * 2. Si no existe por apiId:
   *    se busca por liga + equipos + fecha.
   *
   * 3. Si existe un Match local equivalente:
   *    se reutiliza para no romper Prediction/
   *    TournamentMatch.
   *
   * 4. Si no existe:
   *    se crea.
   *
   * 5. El Matchday se resuelve según el calendario
   *    oficial del Apertura 2026.
   */
  async importUpcomingMatches(
    dates?: string,
  ) {
    const syncDates =
      dates ?? this.getDefaultSyncRange();

    const data =
      await this.getLigaMxScoreboard(
        syncDates,
      );

    const events =
      data.events ?? [];

    this.logger.log(
      `Sincronización ESPN. Rango: ${syncDates}. Eventos: ${events.length}`,
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let scored = 0;
    let predictionsScored = 0;

    for (const event of events) {
      try {
        const competition =
          event.competitions?.[0];

        if (!competition) {
          skipped++;

          this.logger.warn(
            `Evento ESPN ${event.id} sin competition.`,
          );

          continue;
        }

        const competitors =
          competition.competitors ?? [];

        const homeCompetitor =
          competitors.find(
            (competitor: any) =>
              competitor.homeAway ===
              'home',
          );

        const awayCompetitor =
          competitors.find(
            (competitor: any) =>
              competitor.homeAway ===
              'away',
          );

        if (
          !homeCompetitor ||
          !awayCompetitor
        ) {
          skipped++;

          this.logger.warn(
            `Evento ESPN ${event.id} sin local/visitante.`,
          );

          continue;
        }

        const espnHomeTeamId =
          Number(
            homeCompetitor.team?.id,
          );

        const espnAwayTeamId =
          Number(
            awayCompetitor.team?.id,
          );

        const homeTeamId =
          this.teamMap[
            espnHomeTeamId
          ];

        const awayTeamId =
          this.teamMap[
            espnAwayTeamId
          ];

        if (
          !homeTeamId ||
          !awayTeamId
        ) {
          skipped++;

          this.logger.warn(
            `Evento ESPN ${event.id} omitido por equipo no mapeado: ` +
              `${espnHomeTeamId} vs ${espnAwayTeamId}`,
          );

          continue;
        }

        const date =
          new Date(event.date);

        if (
          Number.isNaN(
            date.getTime(),
          )
        ) {
          skipped++;

          this.logger.warn(
            `Evento ESPN ${event.id} con fecha inválida.`,
          );

          continue;
        }

        const statusType =
          competition.status?.type;

        const completed =
          statusType?.completed === true;

        const homeScore =
          homeCompetitor.score != null
            ? Number(
                homeCompetitor.score,
              )
            : null;

        const awayScore =
          awayCompetitor.score != null
            ? Number(
                awayCompetitor.score,
              )
            : null;

        const espnApiId =
          Number(event.id);

        if (
          !Number.isInteger(
            espnApiId,
          )
        ) {
          skipped++;

          this.logger.warn(
            `Evento ESPN ${event.id} con ID inválido.`,
          );

          continue;
        }

        /**
         * Resolver jornada antes de modificar/crear Match.
         */
        const matchday =
          await this.resolveMatchday(
            date,
          );

        /**
         * Buscar primero por apiId ESPN.
         */
        let existingMatch =
          await this.prisma.match.findUnique({
            where: {
              apiId: espnApiId,
            },
          });

        /**
         * Validar que el apiId no esté asociado
         * a otro partido.
         */
        if (
          existingMatch &&
          (
            existingMatch.leagueId !==
              this.leagueId ||
            existingMatch.homeTeamId !==
              homeTeamId ||
            existingMatch.awayTeamId !==
              awayTeamId
          )
        ) {
          skipped++;

          this.logger.warn(
            `Colisión de apiId ESPN ${espnApiId}. ` +
              `Match ${existingMatch.id} no corresponde a ` +
              `${homeTeamId} vs ${awayTeamId}.`,
          );

          continue;
        }

        /**
         * Si no existe por apiId, buscar por
         * equipos + fecha aproximada.
         */
        if (!existingMatch) {
          const from =
            new Date(
              date.getTime() -
                24 *
                  60 *
                  60 *
                  1000,
            );

          const to =
            new Date(
              date.getTime() +
                24 *
                  60 *
                  60 *
                  1000,
            );

          existingMatch =
            await this.prisma.match.findFirst({
              where: {
                leagueId:
                  this.leagueId,

                homeTeamId,

                awayTeamId,

                date: {
                  gte: from,
                  lte: to,
                },
              },

              orderBy: {
                date: 'asc',
              },
            });
        }

        /**
         * Actualizar Match existente.
         */
        if (existingMatch) {
          const match =
            await this.prisma.match.update({
              where: {
                id:
                  existingMatch.id,
              },

              data: {
                apiId:
                  existingMatch.apiId ===
                  espnApiId
                    ? existingMatch.apiId
                    : espnApiId,

                date,

                homeScore,

                awayScore,

                finished:
                  completed,

                homeTeamId,

                awayTeamId,

                leagueId:
                  this.leagueId,

                matchdayId:
                  matchday.id,
              },
            });

          updated++;

          this.logger.log(
            `Match ${match.id} actualizado desde ESPN. ` +
              `Jornada ${matchday.number}.`,
          );

          if (
            match.finished &&
            match.homeScore !==
              null &&
            match.awayScore !==
              null
          ) {
            const scoringResult =
              await this.scoringService.scoreMatch(
                match.id,
              );

            scored++;

            predictionsScored +=
              scoringResult.scored ??
              0;

            this.logger.log(
              `Match ${match.id} sincronizado y calificado. ` +
                `Predicciones actualizadas: ${
                  scoringResult.scored ??
                  0
                }`,
            );
          }

          continue;
        }

        /**
         * Crear Match nuevo.
         */
        const newMatch =
          await this.prisma.match.create({
            data: {
              apiId:
                espnApiId,

              date,

              homeScore,

              awayScore,

              finished:
                completed,

              homeTeamId,

              awayTeamId,

              matchdayId:
                matchday.id,

              leagueId:
                this.leagueId,
            },
          });

        created++;

        this.logger.log(
          `Match ${newMatch.id} creado desde ESPN. ` +
            `ESPN ${espnApiId} | ` +
            `Jornada ${matchday.number} | ` +
            `${homeTeamId} vs ${awayTeamId}`,
        );

        if (
          newMatch.finished &&
          newMatch.homeScore !==
            null &&
          newMatch.awayScore !==
            null
        ) {
          const scoringResult =
            await this.scoringService.scoreMatch(
              newMatch.id,
            );

          scored++;

          predictionsScored +=
            scoringResult.scored ??
            0;
        }
      } catch (error) {
        skipped++;

        this.logger.error(
          `Error sincronizando evento ESPN ${event.id}:`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }

    return {
      success: true,
      source: 'ESPN',
      leagueId:
        this.leagueId,
      season:
        this.season,
      dates:
        syncDates,
      eventsReceived:
        events.length,
      created,
      updated,
      skipped,
      scored,
      predictionsScored,
    };
  }

  /**
   * Resuelve el Matchday utilizando la fecha local
   * de Ciudad de México.
   *
   * Esto es importante porque ESPN entrega la fecha
   * en UTC y algunos partidos pueden cruzar medianoche.
   */
  private async resolveMatchday(
    eventDate: Date,
  ) {
    const localDate =
      this.getMexicoLocalDate(
        eventDate,
      );

    const round =
      this.regularSeasonRounds.find(
        (item) =>
          localDate >= item.start &&
          localDate <= item.end,
      );

    if (!round) {
      this.logger.warn(
        `No se encontró jornada oficial para ` +
          `${localDate}. Se utilizará Matchday general.`,
      );

      /**
       * Fallback al Matchday general existente.
       *
       * No borramos ni modificamos esta estructura
       * mientras existan partidos que dependan de ella.
       */
      const fallback =
        await this.prisma.matchday.findFirst({
          where: {
            leagueId:
              this.leagueId,

            season:
              this.season,

            tournament:
              'Liga MX',

            number:
              null,
          },

          orderBy: {
            id: 'asc',
          },
        });

      if (fallback) {
        return fallback;
      }

      /**
       * Último fallback.
       */
      const lastMatchday =
        await this.prisma.matchday.findFirst({
          where: {
            leagueId:
              this.leagueId,

            season:
              this.season,
          },

          orderBy: {
            id: 'desc',
          },
        });

      if (lastMatchday) {
        return lastMatchday;
      }

      throw new Error(
        `No existe Matchday disponible para ` +
          `Liga MX ${this.season}.`,
      );
    }

    /**
     * Intentar encontrar la jornada oficial
     * por número.
     */
    let matchday =
      await this.prisma.matchday.findFirst({
        where: {
          leagueId:
            this.leagueId,

          season:
            this.season,

          tournament:
            'Liga MX',

          number:
            round.number,
        },
      });

    const startDate =
      this.createUtcDate(
        round.start,
      );

    const endDate =
      this.createUtcDate(
        round.end,
      );

    /**
     * Si la jornada todavía no existe,
     * la creamos.
     */
    if (!matchday) {
      matchday =
        await this.prisma.matchday.create({
          data: {
            leagueId:
              this.leagueId,

            number:
              round.number,

            tournament:
              'Liga MX',

            roundName:
              `Liga MX - Jornada ${round.number}`,

            season:
              this.season,

            startDate,

            endDate,

            active:
              false,
          },
        });

      this.logger.log(
        `Matchday creado: Jornada ${round.number} ` +
          `(id ${matchday.id})`,
      );

      return matchday;
    }

    /**
     * Actualizar las fechas si fueran diferentes.
     */
    if (
      matchday.startDate.getTime() !==
        startDate.getTime() ||
      matchday.endDate.getTime() !==
        endDate.getTime() ||
      matchday.roundName !==
        `Liga MX - Jornada ${round.number}`
    ) {
      matchday =
        await this.prisma.matchday.update({
          where: {
            id:
              matchday.id,
          },

          data: {
            startDate,

            endDate,

            roundName:
              `Liga MX - Jornada ${round.number}`,
          },
        });
    }

    return matchday;
  }

  /**
   * Convierte una fecha ESPN UTC a la fecha
   * local de Ciudad de México.
   *
   * Devuelve YYYY-MM-DD.
   */
  private getMexicoLocalDate(
    date: Date,
  ): string {
    const formatter =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'America/Mexico_City',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        },
      );

    return formatter.format(
      date,
    );
  }

  /**
   * Convierte YYYY-MM-DD a Date UTC.
   */
  private createUtcDate(
    value: string,
  ): Date {
    const [
      year,
      month,
      day,
    ] =
      value
        .split('-')
        .map(Number);

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );
  }

  /**
   * Ventana automática:
   *
   * 3 días atrás
   * 14 días adelante
   */
  private getDefaultSyncRange(): string {
    const now =
      new Date();

    const start =
      new Date(now);

    start.setUTCDate(
      start.getUTCDate() - 3,
    );

    const end =
      new Date(now);

    end.setUTCDate(
      end.getUTCDate() + 14,
    );

    return (
      `${this.formatDateValue(start)}-` +
      `${this.formatDateValue(end)}`
    );
  }

  /**
   * Convierte YYYYMMDD a Date UTC.
   */
  private parseDateValue(
    value: string,
  ): Date | null {
    if (
      !/^\d{8}$/.test(value)
    ) {
      return null;
    }

    const year =
      Number(
        value.slice(0, 4),
      );

    const month =
      Number(
        value.slice(4, 6),
      );

    const day =
      Number(
        value.slice(6, 8),
      );

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
        ),
      );

    if (
      date.getUTCFullYear() !==
        year ||
      date.getUTCMonth() !==
        month - 1 ||
      date.getUTCDate() !==
        day
    ) {
      return null;
    }

    return date;
  }

  /**
   * Convierte Date a YYYYMMDD.
   */
  private formatDateValue(
    date: Date,
  ): string {
    const year =
      date.getUTCFullYear();

    const month =
      String(
        date.getUTCMonth() + 1,
      ).padStart(
        2,
        '0',
      );

    const day =
      String(
        date.getUTCDate(),
      ).padStart(
        2,
        '0',
      );

    return `${year}${month}${day}`;
  }
}