"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HomeStats = {
  tournamentId: number;
  name: string;
  registered: number;
  maxPlayers: number | null;
  available: number | null;
  registrationOpen: boolean;
  registrationStartsAt: string;
  registrationEndsAt: string;
  startsAt: string;
  endsAt: string;
};

function dateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
    timeZoneName: "short",
  }).format(date);
}

function remaining(target: string, now: number) {
  const diff = new Date(target).getTime() - now;

  if (!Number.isFinite(diff) || diff <= 0) {
    return null;
  }

  const minutes = Math.floor(diff / 60000);

  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}

export default function HomeTournamentStats() {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const api = process.env.NEXT_PUBLIC_API_URL;

      if (!api) {
        if (active) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `${api.replace(/\/$/, "")}/tournaments/home-stats`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("No disponible");
        }

        const data: HomeStats | null = await response.json();

        if (active) {
          setStats(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    setNow(Date.now());
    void refresh();

    const timer = setInterval(() => setNow(Date.now()), 1000);
    const polling = setInterval(() => void refresh(), 60000);

    return () => {
      active = false;
      clearInterval(timer);
      clearInterval(polling);
    };
  }, []);

  if (loading) {
    return (
      <p className="mt-10 text-sm text-slate-300" role="status">
        Consultando el torneo...
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-10 text-sm text-slate-300" role="status">
        No se pudo consultar el estado del torneo.
      </p>
    );
  }

  if (!stats) {
    return (
      <section className="mt-10 rounded-2xl border border-white/15 bg-slate-950/70 p-6">
        <p className="font-bold text-white">
          Próximamente nuevos torneos
        </p>
        <Link href="/reglas" className="mt-3 inline-block text-sm text-red-300 hover:underline">
          Consultar reglamento
        </Link>
      </section>
    );
  }

  const registrationEnd = new Date(stats.registrationEndsAt).getTime();
  const registrationStart = new Date(stats.registrationStartsAt).getTime();
  const tournamentStart = new Date(stats.startsAt).getTime();
  const currentTime = now ?? 0;

  const countdown = now === null
    ? null
    : remaining(stats.registrationEndsAt, currentTime);

  const openByTime =
    now !== null &&
    currentTime >= registrationStart &&
    currentTime < registrationEnd &&
    currentTime < tournamentStart;

  const registrationOpen = openByTime &&
    (stats.maxPlayers === null || (stats.available ?? 0) > 0);

  const statusLabel = now === null
    ? "Consultando estado..."
    : registrationOpen
      ? "Inscripciones abiertas"
      : currentTime < registrationStart
        ? "Próxima apertura"
        : "Inscripciones cerradas";

  return (
    <section
      aria-label="Información del torneo activo"
      className="mt-10 max-w-3xl rounded-2xl border border-white/15 bg-[#071321]/90 p-5 backdrop-blur-md sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-red-300">
        Torneo actual
      </p>

      <h2 className="mt-2 text-lg font-bold text-white">
        {stats.name}
      </h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-4xl font-black text-white">
            {stats.registered.toLocaleString("es-CO")}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Personas inscritas
          </p>
        </div>

        <div>
          <p className={`text-lg font-bold ${
            registrationOpen ? "text-green-400" : "text-amber-300"
          }`}>
            {statusLabel}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {stats.maxPlayers === null
              ? "Participación sin límite de cupos"
              : `Cupo configurado: ${stats.maxPlayers}`}
          </p>
        </div>
      </div>

      {registrationOpen && countdown && (
        <div className="mt-7 border-t border-white/15 pt-6">
          <p className="text-sm font-semibold text-white">
            Las inscripciones cierran en
          </p>

          <div className="mt-4 grid max-w-sm grid-cols-3 gap-3">
            {[
              [countdown.days, "Días"],
              [countdown.hours, "Horas"],
              [countdown.minutes, "Minutos"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
              >
                <p className="text-2xl font-black text-white">
                  {String(value).padStart(2, "0")}
                </p>
                <p className="text-xs text-slate-300">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2 border-t border-white/15 pt-5 text-sm">
        <p className="text-slate-300">
          Cierre de inscripciones:{" "}
          <span className="font-semibold text-white">
            {dateLabel(stats.registrationEndsAt)}
          </span>
        </p>

        <p className="text-slate-300">
          Inicio del torneo:{" "}
          <span className="font-semibold text-white">
            {dateLabel(stats.startsAt)}
          </span>
        </p>

        <p className="text-slate-300">
          Finalización prevista:{" "}
          <span className="font-semibold text-white">
            {dateLabel(stats.endsAt)}
          </span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/reglas"
          className="text-sm font-semibold text-red-300 hover:underline"
        >
          Consultar reglamento →
        </Link>
        <Link
          href="/register"
          className="text-sm font-semibold text-white hover:underline"
        >
          Crear cuenta →
        </Link>
      </div>
    </section>
  );
}
