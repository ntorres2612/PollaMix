import { apiFetch } from './api';
import { ApiMatch } from '@/types/match';

export interface Team {
  id: number;
  name: string;
  shortName: string;
  logo: string;
  leagueId: number;
  createdAt: string;
}

export interface Match {
  id: number;
  apiId: number;
  date: string;

  homeScore: number | null;
  awayScore: number | null;

  finished: boolean;

  homeTeamId: number;
  awayTeamId: number;

  matchdayId: number;
  leagueId: number;

  homeTeam: Team;
  awayTeam: Team;

  matchday: {
    id: number;
    leagueId: number;
    season: number;
    tournament: string;
    roundName: string;
    number: number;
    startDate: string;
    endDate: string;
    active: boolean;
  };
}


export async function getMatches(): Promise<ApiMatch[]> {
  return apiFetch<ApiMatch[]>('/matches');
}

export async function getMatch(
  id: number,
): Promise<ApiMatch> {
  return apiFetch<ApiMatch>(`/matches/${id}`);
}

export async function getMatchesByMatchday(
  matchdayId: number,
): Promise<ApiMatch[]> {
  return apiFetch<ApiMatch[]>(
    `/matches/matchday/${matchdayId}`,
  );
}