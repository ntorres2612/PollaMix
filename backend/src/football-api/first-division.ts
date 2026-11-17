const CLOSED_STATUSES = new Set([
  'FT',
  'AET',
  'PEN',
  'AWD',
  'WO',
  '1H',
  '2H',
  'HT',
  'ET',
  'BT',
  'P',
  'LIVE',
  'INT',
  'SUSP',
  'ABD',
  'CANC',
]);

// Primera división de cada país en API-Football. Quedan afuera copas,
// segundas, amateurs, reservas, juveniles y torneos de selecciones.
const FIRST_DIVISION_LEAGUE_IDS = new Set([
  39, 61, 71, 78, 88, 94, 98, 103, 106, 119, 128, 135, 140, 144, 162, 169,
  172, 179, 186, 188, 197, 203, 207, 210, 218, 235, 239, 242, 252, 253, 262,
  265, 268, 271, 274, 281, 283, 286, 288, 290, 292, 296, 299, 301, 304, 305,
  307, 310, 312, 315, 318, 323, 327, 330, 332, 333, 339, 340, 342, 344, 345,
  355, 362, 363, 368, 370, 371, 373, 380, 390, 393, 394, 399, 400, 401, 406,
  408, 410, 415, 419, 424, 479, 542, 570, 584, 585, 588, 636, 647, 664, 758,
  760, 765,
]);

// Amistosos de selecciones mayores y eliminatorias de mayores.
// Quedan afuera amistosos de clubes, juveniles y el torneo final.
const SENIOR_NATIONAL_TEAM_LEAGUE_IDS = new Set([
  10,
  29, 30, 31, 32, 33, 34, 35, 36, 37,
  808, 858, 960, 1163, 1169,
]);

export function isFirstDivisionLeague(leagueId: number) {
  return FIRST_DIVISION_LEAGUE_IDS.has(leagueId);
}

export function isSeniorNationalTeamLeague(leagueId: number) {
  return SENIOR_NATIONAL_TEAM_LEAGUE_IDS.has(leagueId);
}

export function isBoardLeague(leagueId: number) {
  return isFirstDivisionLeague(leagueId) || isSeniorNationalTeamLeague(leagueId);
}

const YOUTH_OR_WOMEN = /\bU\d{2}\b|\bunder[-\s]?\d{2}\b|\b(women|woman|femenina|femenino)\b|\sW$/i;

export function isSeniorSquad(name: string) {
  return !YOUTH_OR_WOMEN.test(name);
}

export function isBoardFixture(leagueId: number, home: string, away: string) {
  if (isFirstDivisionLeague(leagueId)) return true;
  if (!isSeniorNationalTeamLeague(leagueId)) return false;
  return isSeniorSquad(home) && isSeniorSquad(away);
}

export function isAvailableKickoff(kickoff: Date, status: string, now: number) {
  return kickoff.getTime() > now && !CLOSED_STATUSES.has(status);
}
