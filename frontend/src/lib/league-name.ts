import { countryNameEs } from "@/lib/team-name";

const EXACT: Record<string, string> = {
  "uefa champions league": "Liga de Campeones",
  "uefa champions league women": "Liga de Campeones femenina",
  "uefa europa league": "Liga Europa",
  "uefa europa conference league": "Liga Conferencia",
  "uefa nations league": "Liga de Naciones",
  "uefa nations league - women": "Liga de Naciones femenina",
  "uefa super cup": "Supercopa de Europa",
  "uefa u21 championship": "Eurocopa Sub-21",
  "uefa u21 championship - qualification": "Eliminatorias al Europeo Sub-21",
  "uefa u19 championship": "Europeo Sub-19",
  "uefa u19 championship - qualification": "Eliminatorias al Europeo Sub-19",
  "uefa u17 championship": "Europeo Sub-17",
  "uefa u17 championship - qualification": "Eliminatorias al Europeo Sub-17",
  "uefa youth league": "Liga Juvenil de la UEFA",
  "world cup": "Mundial",
  "world cup - women": "Mundial femenino",
  "world cup - u17": "Mundial Sub-17",
  "world cup - u20": "Mundial Sub-20",
  "world cup - u17 - women": "Mundial femenino Sub-17",
  "world cup - u20 - women": "Mundial femenino Sub-20",
  "world cup - qualification europe": "Eliminatorias europeas al Mundial",
  "world cup - qualification concacaf": "Eliminatorias de la Concacaf al Mundial",
  "world cup - qualification south america": "Eliminatorias sudamericanas al Mundial",
  "world cup - qualification africa": "Eliminatorias africanas al Mundial",
  "world cup - qualification asia": "Eliminatorias asiáticas al Mundial",
  "world cup - qualification oceania": "Eliminatorias de Oceanía al Mundial",
  "world cup - qualification intercontinental play-offs": "Repechaje intercontinental al Mundial",
  "copa america": "Copa América",
  "copa america femenina": "Copa América femenina",
  "conmebol libertadores": "Copa Libertadores",
  "conmebol libertadores femenina": "Copa Libertadores femenina",
  "conmebol libertadores u20": "Copa Libertadores Sub-20",
  "conmebol sudamericana": "Copa Sudamericana",
  "conmebol recopa": "Recopa Sudamericana",
  "concacaf champions league": "Liga de Campeones de la Concacaf",
  "concacaf gold cup": "Copa Oro",
  "concacaf gold cup - women": "Copa Oro femenina",
  "concacaf gold cup - qualification": "Eliminatorias a la Copa Oro",
  "concacaf nations league": "Liga de Naciones de la Concacaf",
  "concacaf nations league - qualification": "Eliminatorias a la Liga de Naciones de la Concacaf",
  "fifa club world cup": "Mundial de Clubes",
  "fifa intercontinental cup": "Copa Intercontinental",
  "coupe de france": "Copa de Francia",
  "dfb pokal": "Copa de Alemania",
  "dfb pokal - women": "Copa de Alemania femenina",
  "fa cup|england": "Copa FA",
  "primera a|colombia": "Liga BetPlay",
  "serie a|brazil": "Brasileirão",
  "la liga|spain": "LaLiga",
  "liga mx": "Liga MX",
  "friendlies": "Amistosos de selecciones",
  "friendly international": "Amistoso internacional",
};

const REGIONS: Record<string, string> = {
  niedersachsen: "Baja Sajonia",
  niederrhein: "Bajo Rin",
  mittelrhein: "Rin Medio",
  westfalen: "Westfalia",
  hessen: "Hesse",
  "bayern nord": "Baviera norte",
  "bayern sud": "Baviera sur",
  "bayern süd": "Baviera sur",
  "rheinland-pfalz / saar": "Renania-Palatinado y Sarre",
  "schleswig-holstein": "Schleswig-Holstein",
  "baden-württemberg": "Baden-Wurtemberg",
  "baden-wurttemberg": "Baden-Wurtemberg",
  nordost: "Noreste",
  sudwest: "Suroeste",
  südwest: "Suroeste",
};

const GLOBAL = /^(liga de campeones|liga europa|liga conferencia|liga de naciones|eurocopa|europeo |eliminatorias|mundial|copa américa|copa libertadores|copa sudamericana|recopa sudamericana|copa oro|supercopa de europa|liga juvenil|mundial de clubes|copa intercontinental|laliga|liga mx|liga betplay|brasileirão)/i;

function applyTokens(value: string) {
  return value
    .replace(/\bSuper Cup\b/gi, "Supercopa")
    .replace(/\bPremier League\b/gi, "Liga Premier")
    .replace(/\bFirst League\b/gi, "Primera División")
    .replace(/\b1st Division\b/gi, "Primera División")
    .replace(/\bSecond League\b/gi, "Segunda División")
    .replace(/\b2nd Division\b/gi, "Segunda División")
    .replace(/\bThird League\b/gi, "Tercera División")
    .replace(/\bPlay-?offs?\b/gi, "Repechaje")
    .replace(/\bQualification\b/gi, "Clasificación")
    .replace(/\bRegular Season\b/gi, "Temporada regular")
    .replace(/\bWomen\b/gi, "femenina")
    .replace(/\bWoman\b/gi, "femenina")
    .replace(/\bGroup\b/gi, "Grupo")
    .replace(/\bNorth\b/gi, "Norte")
    .replace(/\bSouth\b/gi, "Sur")
    .replace(/\bEast\b/gi, "Este")
    .replace(/\bWest\b/gi, "Oeste")
    .replace(/\bLeague\b/gi, "Liga")
    .replace(/\bDivision\b/gi, "División")
    .replace(/\bCup\b/gi, "Copa")
    .replace(/\bChampionship\b/gi, "Campeonato")
    .replace(/\bU1[7-9]\b/gi, (token) => `Sub-${token.slice(1)}`)
    .replace(/\bU2[0-3]\b/gi, (token) => `Sub-${token.slice(1)}`)
    .replace(/\s+/g, " ")
    .trim();
}

export function leagueNameEs(name: string, country?: string | null): string {
  const original = name.trim();
  const countryKey = (country ?? "").replace(/-/g, " ").trim().toLowerCase();
  const exact = EXACT[`${original.toLowerCase()}|${countryKey}`] ?? EXACT[original.toLowerCase()];
  if (exact) return exact;

  let text = original;
  for (const [region, spanish] of Object.entries(REGIONS)) {
    text = text.replace(new RegExp(region, "ig"), spanish);
  }
  text = applyTokens(text);
  text = text.replace(/\s+-\s+/g, " · ");

  const countryEs = country && country.toLowerCase() !== "world"
    ? countryNameEs(country)
    : "";
  if (
    countryEs &&
    !GLOBAL.test(text) &&
    !text.toLowerCase().includes(countryEs.toLowerCase())
  ) {
    text = `${text} de ${countryEs}`;
  }

  return text;
}

export function roundNameEs(name: string): string {
  const trimmed = name.trim();
  const finals = trimmed.match(/^1\/(\d+)-finals$/i);
  if (finals) {
    const size = Number(finals[1]);
    if (size === 2) return "Final";
    if (size === 4) return "Cuartos de final";
    if (size === 8) return "Octavos de final";
    if (size === 16) return "Dieciseisavos de final";
    return `${size}avos de final`;
  }

  const jornada = trimmed.match(/jornada\s+(\d+)\s*$/i);
  if (jornada) return `fecha ${jornada[1]}`;

  const dated = trimmed.match(/^(.*?) - (\d+)$/);
  if (dated) {
    return `${leagueNameEs(dated[1])} · fecha ${dated[2]}`;
  }

  return leagueNameEs(trimmed);
}

export function competitionLabel(
  leagueName?: string | null,
  country?: string | null,
  roundName?: string | null,
): string {
  const league = leagueName ? leagueNameEs(leagueName, country) : "";
  const round = roundName ? roundNameEs(roundName) : "";
  if (!league) return round;
  if (!round) return league;

  const roundPlace = round.replace(/ · fecha \d+$/i, "");
  const fecha = round.match(/fecha \d+/i)?.[0];
  if (roundPlace && league.toLowerCase().includes(roundPlace.toLowerCase())) {
    return fecha ? `${league} · ${fecha}` : league;
  }

  return `${league} · ${round}`;
}
