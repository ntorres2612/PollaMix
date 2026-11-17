export interface MatchClockInput {
  date: string;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  statusShort?: string | null;
  elapsed?: number | null;
  extraTime?: number | null;
  liveAt?: string | null;
}

export interface MatchClock {
  phase: "upcoming" | "live" | "finished";
  minute: string | null;
  score: string | null;
  kickoff: string;
}

const LIVE_STATUS = new Set(["1H", "2H", "ET", "LIVE"]);

function formatKickoff(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scoreText(match: MatchClockInput): string | null {
  if (
    !Number.isInteger(match.homeScore) ||
    !Number.isInteger(match.awayScore)
  ) {
    return null;
  }

  return `${match.homeScore} - ${match.awayScore}`;
}

function tickMinutes(liveAt: string | null | undefined, now: number): number {
  if (!liveAt) return 0;

  const observed = new Date(liveAt).getTime();

  if (!Number.isFinite(observed) || observed > now) return 0;

  return Math.min(20, Math.floor((now - observed) / 60000));
}

function minuteLabel(minute: number, regulation: number): string {
  const shown = Math.max(1, minute);

  if (shown <= regulation) {
    return `${shown}'`;
  }

  return `${regulation}+${Math.min(shown - regulation, 15)}'`;
}

function formatApiMinute(
  status: string,
  elapsed: number,
  extra: number | null | undefined,
  liveAt: string | null | undefined,
  now: number,
): string {
  const minute =
    Math.max(0, elapsed) +
    Math.max(0, extra ?? 0) +
    tickMinutes(liveAt, now);

  if (status === "1H") return minuteLabel(minute, 45);
  if (status === "ET") return minuteLabel(minute, 120);

  return minuteLabel(minute, 90);
}

function formatWallMinute(kickoffMs: number, now: number): string {
  const wall = Math.floor((now - kickoffMs) / 60000);

  if (wall <= 0) return "1'";
  if (wall <= 45) return `${wall}'`;
  if (wall <= 60) return "Medio tiempo";

  const secondHalf = wall - 15;

  if (secondHalf <= 90) return `${secondHalf}'`;
  if (wall <= 120) return `90+${Math.min(secondHalf - 90, 12)}'`;

  return "En vivo";
}

export function matchClock(
  match: MatchClockInput,
  now = Date.now(),
): MatchClock {
  const kickoffMs = new Date(match.date).getTime();
  const kickoff = formatKickoff(match.date);
  const status = (match.statusShort || "").toUpperCase();
  const score = scoreText(match);

  if (
    match.finished ||
    status === "FT" ||
    status === "AET" ||
    status === "PEN"
  ) {
    return {
      phase: "finished",
      minute:
        status === "PEN"
          ? "Final (penales)"
          : status === "AET"
            ? "Final (alargue)"
            : "Final",
      score,
      kickoff,
    };
  }

  if (status === "PST") {
    return { phase: "upcoming", minute: "Aplazado", score: null, kickoff };
  }

  if (status === "CANC") {
    return { phase: "upcoming", minute: "Cancelado", score: null, kickoff };
  }

  if (status === "ABD" || status === "SUSP" || status === "INT") {
    return { phase: "live", minute: "Suspendido", score, kickoff };
  }

  if (status === "P") {
    return { phase: "live", minute: "Penales", score, kickoff };
  }

  if (status === "HT" || status === "BT") {
    return { phase: "live", minute: "Medio tiempo", score, kickoff };
  }

  const started = Number.isFinite(kickoffMs) && now >= kickoffMs;

  if (!started && !LIVE_STATUS.has(status)) {
    return { phase: "upcoming", minute: null, score: null, kickoff };
  }

  const minute =
    LIVE_STATUS.has(status) && Number.isInteger(match.elapsed)
      ? formatApiMinute(status, match.elapsed as number, match.extraTime, match.liveAt, now)
      : formatWallMinute(kickoffMs, now);

  return { phase: "live", minute, score, kickoff };
}

export function matchMomentLabel(
  match: MatchClockInput,
  now = Date.now(),
): string {
  const clock = matchClock(match, now);

  if (clock.phase === "finished") {
    return clock.score ? `${clock.minute} ${clock.score}` : clock.minute || "Final";
  }

  if (clock.phase === "live") {
    if (
      clock.minute === "Medio tiempo" ||
      clock.minute === "Penales" ||
      clock.minute === "Suspendido"
    ) {
      return clock.score ? `${clock.minute} · ${clock.score}` : clock.minute;
    }

    const minute =
      clock.minute && clock.minute !== "En vivo" ? clock.minute : "";

    return clock.score
      ? `En vivo ${minute} · ${clock.score}`.replace("  ", " ")
      : `En vivo ${minute}`.trim();
  }

  if (clock.minute === "Aplazado" || clock.minute === "Cancelado") {
    return clock.minute;
  }

  return clock.kickoff;
}
