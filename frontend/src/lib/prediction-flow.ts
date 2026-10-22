import { apiFetch } from "@/lib/api";

import {
  ApiMatch,
} from "@/types/match";

export interface PlayerPrediction {
  id: number;

  matchId: number;

  tournamentId: number;

  homeScore: number;

  awayScore: number;

  points: number;

  createdAt?: string;

  updatedAt?: string;
}

export interface CreatePredictionInput {
  matchId: number;

  tournamentId: number;

  homeScore: number;

  awayScore: number;
}

export interface SelectedPredictionMatch
  extends ApiMatch {
  position?: number;
}

/**
 * Obtiene los 10 partidos seleccionados
 * específicamente para el torneo.
 */
export async function getPredictionMatches(
  tournamentId: number,
): Promise<SelectedPredictionMatch[]> {
  const response =
    await apiFetch<{
      tournament: {
        id: number;
        name: string;
        season: number;
        leagueId: number;
      };

      matches: SelectedPredictionMatch[];
    }>(
      `/tournaments/${tournamentId}/matches`,
    );

  return response.matches;
}

/**
 * Obtiene los pronósticos del usuario autenticado.
 *
 * El backend actualmente expone GET /predictions.
 *
 * Se admite tanto:
 * - array directo
 * - { data: [...] }
 * - { predictions: [...] }
 * - { results: [...] }
 *
 * para mantener tolerancia con el formato actual del backend.
 */
export async function getMyPredictions(): Promise<
  PlayerPrediction[]
> {
  const response =
    await apiFetch<unknown>(
      "/predictions",
    );

  if (Array.isArray(response)) {
    return response as PlayerPrediction[];
  }

  if (
    response &&
    typeof response === "object"
  ) {
    const value =
      response as Record<
        string,
        unknown
      >;

    if (
      Array.isArray(
        value.predictions,
      )
    ) {
      return value.predictions as PlayerPrediction[];
    }

    if (
      Array.isArray(
        value.data,
      )
    ) {
      return value.data as PlayerPrediction[];
    }

    if (
      Array.isArray(
        value.results,
      )
    ) {
      return value.results as PlayerPrediction[];
    }
  }

  return [];
}

/**
 * Crear un nuevo pronóstico.
 *
 * POST /predictions
 */
export async function createPlayerPrediction(
  data: CreatePredictionInput,
): Promise<PlayerPrediction> {
  return apiFetch<PlayerPrediction>(
    "/predictions",
    {
      method: "POST",

      body: JSON.stringify({
        matchId:
          data.matchId,

        tournamentId:
          data.tournamentId,

        homeScore:
          data.homeScore,

        awayScore:
          data.awayScore,
      }),
    },
  );
}

/**
 * Buscar un pronóstico concreto
 * para un partido y torneo.
 */
export function findPrediction(
  predictions: PlayerPrediction[],
  matchId: number,
  tournamentId: number,
) {
  return predictions.find(
    (prediction) =>
      prediction.matchId ===
        matchId &&
      prediction.tournamentId ===
        tournamentId,
  );
}