import { apiFetch } from "@/lib/api";

export interface ScoreMatchResponse {
  success: boolean;

  matchId: number;

  predictions: number;

  scored: number;

  result: {
    homeScore: number;

    awayScore: number;
  };
}

export interface SyncResultsResponse {
  success: boolean;

  updated: number;

  scored: number;

  ignored: number;

  total: number;

  leagueId: number;

  season: number;
}

export async function scoreMatch(
  matchId: number,
): Promise<ScoreMatchResponse> {
  return apiFetch<ScoreMatchResponse>(
    `/scoring/${matchId}`,
    {
      method: "POST",
    },
  );
}

/**
 * Sincroniza los resultados de API-Sports
 * y recalcula automáticamente el scoring
 * de los partidos finalizados.
 */
export async function syncFootballResults(
  leagueId: number,
  season: number,
): Promise<SyncResultsResponse> {
  return apiFetch<SyncResultsResponse>(
    `/football/update-results/${leagueId}/${season}`,
    {
      method: "POST",
    },
  );
}