import { apiFetch } from './api';

export interface Matchday {
  id: number;
  leagueId: number;
  season: number;
  tournament: string;
  roundName: string;
  number: number;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

export async function getMatchdays(): Promise<Matchday[]> {
  return apiFetch<Matchday[]>('/matchdays');
}

export async function getMatchdaysByLeagueAndSeason(
  leagueId: number,
  season: number,
): Promise<Matchday[]> {
  return apiFetch<Matchday[]>(
    `/matchdays/league/${leagueId}/season/${season}`,
  );
}

export async function getMatchday(
  id: number,
): Promise<Matchday> {
  return apiFetch<Matchday>(
    `/matchdays/${id}`,
  );
}