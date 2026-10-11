export interface ApiTeam {
  id: number;
  name: string;
  shortName: string;
  logo: string;
  leagueId: number;
  createdAt: string;
}

export interface ApiMatchday {
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


export interface ApiMatch {
  id: number;
  apiId: number;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
  scoredAt: string | null;
  createdAt: string;
  homeTeamId: number;
  awayTeamId: number;
  matchdayId: number;
  leagueId: number;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  matchday: ApiMatchday;
}