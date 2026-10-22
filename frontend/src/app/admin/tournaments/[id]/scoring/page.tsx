"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import {
  getSelectedTournamentMatches,
  getTournament,
  TournamentDetail,
} from "@/lib/tournaments";

import {
  scoreMatch,
  syncFootballResults,
} from "@/lib/scoring-flow";

import {
  ApiMatch,
} from "@/types/match";

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "es-CO",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function matchStarted(
  value: string,
) {
  return (
    new Date(value).getTime() <=
    Date.now()
  );
}

export default function TournamentScoringPage() {

  const params =
    useParams();

  const router =
    useRouter();

  const tournamentId =
    Number(params.id);

  const [
    tournament,
    setTournament,
  ] =
    useState<TournamentDetail | null>(
      null,
    );

  const [
    matches,
    setMatches,
  ] =
    useState<ApiMatch[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    scoringMatchId,
    setScoringMatchId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    syncing,
    setSyncing,
  ] =
    useState(false);

  const [
    lastSync,
    setLastSync,
  ] =
    useState<Date | null>(
      null,
    );

  const [
    scoredMatches,
    setScoredMatches,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >({});

  const loadData =
    useCallback(
      async () => {

        try {

          setLoading(true);
          setError("");

          const [
            tournamentData,
            selectedMatches,
          ] =
            await Promise.all([
              getTournament(
                tournamentId,
              ),

              getSelectedTournamentMatches(
                tournamentId,
              ),
            ]);

          setTournament(
            tournamentData,
          );

          setMatches(selectedMatches);

          setScoredMatches(
            Object.fromEntries(
              selectedMatches
                .filter((match) => match.scoredAt !== null)
                .map((match) => [match.id, true]),
            ),
          );

        } catch (err) {

          console.error(
            "Error cargando partidos:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar los partidos.",
          );

        } finally {

          setLoading(false);

        }

      },
      [
        tournamentId,
      ],
    );

  useEffect(() => {

    const user =
      getCurrentUser();

    if (!user) {

      router.push(
        "/login",
      );

      return;
    }

    if (
      user.role !==
      "ADMIN"
    ) {

      router.push(
        "/",
      );

      return;
    }

    if (
      !Number.isInteger(
        tournamentId,
      ) ||
      tournamentId <= 0
    ) {

      setError(
        "El identificador del torneo no es válido.",
      );

      setLoading(false);

      return;
    }

    loadData();

  }, [
    router,
    tournamentId,
    loadData,
  ]);


  const finishedMatches = useMemo(
    () => matches.filter((match) => match.finished).length,
    [matches],
  );

  const pendingScoring =
    matches.filter(
      (match) =>
        match.finished &&
        !scoredMatches[
        match.id
        ],
    ).length;

  async function handleSyncResults() {

    if (!tournament) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Actualizar los resultados de Liga MX ${tournament.season} desde API-Sports y recalcular los puntos de los partidos finalizados?`,
      );

    if (!confirmed) {
      return;
    }

    try {

      setSyncing(true);
      setError("");
      setSuccess("");

      const result =
        await syncFootballResults(
          tournament.leagueId,
          tournament.season,
        );

      setLastSync(
        new Date(),
      );

      setSuccess(
        `Sincronización completada. ${result.updated} partidos actualizados y ${result.scored} procesados para scoring.`,
      );

      await loadData();

    } catch (err) {

      console.error(
        "Error sincronizando resultados:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar los resultados.",
      );

    } finally {

      setSyncing(false);

    }
  }

  async function handleScoreMatch(
    match: ApiMatch,
  ) {

    if (!match.finished) {

      setError(
        "Este partido todavía no tiene resultado final.",
      );

      return;
    }

    if (
      match.homeScore === null ||
      match.homeScore ===
      undefined ||
      match.awayScore === null ||
      match.awayScore ===
      undefined
    ) {

      setError(
        "Este partido no tiene un resultado válido.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `¿Calcular los puntos del partido ${match.homeTeam.name} vs ${match.awayTeam.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {

      setScoringMatchId(
        match.id,
      );

      setError("");
      setSuccess("");

      const result =
        await scoreMatch(
          match.id,
        );

      await loadData();

      setSuccess(
        `${match.homeTeam.name} ${result.result.homeScore} - ${result.result.awayScore} ${match.awayTeam.name}: ${result.scored} pronóstico(s) puntuado(s).`,
      );

    } catch (err) {

      console.error(
        "Error calculando scoring:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible calcular los puntos.",
      );

    } finally {

      setScoringMatchId(
        null,
      );

    }
  }

  async function handleScoreAllFinished() {

    const eligible =
      matches.filter(
        (match) =>
          match.finished &&
          !scoredMatches[
          match.id
          ],
      );

    if (
      eligible.length ===
      0
    ) {

      setError(
        "No hay partidos pendientes de puntuación.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `¿Calcular los puntos de ${eligible.length} partido(s) finalizado(s)?`,
      );

    if (!confirmed) {
      return;
    }

    try {

      setError("");
      setSuccess("");

      for (
        const match of
        eligible
      ) {

        setScoringMatchId(
          match.id,
        );

        try {

          await scoreMatch(
            match.id,
          );

          // El estado persistente se recuperará al finalizar el lote.
          await loadData();

        } catch (
        matchError
        ) {

          console.error(
            `Error puntuando partido ${match.id}:`,
            matchError,
          );

        }

      }

      setSuccess(
        "Se procesaron los partidos finalizados pendientes de puntuación.",
      );

    } catch (err) {

      console.error(
        "Error procesando scoring:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible procesar la puntuación.",
      );

    } finally {

      setScoringMatchId(
        null,
      );

    }
  }

  if (loading) {

    return (
      <main className="min-h-screen bg-[#071321] px-4 py-10 text-white">

        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center shadow-2xl">

            <p className="text-slate-400">
              Cargando partidos...
            </p>

          </div>

        </div>

      </main>
    );
  }

  if (
    error &&
    !tournament
  ) {

    return (
      <main className="min-h-screen bg-[#071321] px-4 py-10 text-white">

        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl border border-red-500/30 bg-red-950/30 p-8">

            <p className="text-sm font-bold uppercase tracking-wider text-red-400">
              Error
            </p>

            <h1 className="mt-2 text-2xl font-black">
              No fue posible cargar la puntuación
            </h1>

            <p className="mt-3 text-red-200">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Volver
            </button>

          </div>

        </div>

      </main>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#071321] text-white">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Encabezado */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <Link
              href={`/admin/tournaments/${tournament.id}`}
              className="text-sm font-semibold text-slate-400 transition hover:text-red-400"
            >
              ← Volver al torneo
            </Link>

            <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-red-400">
              Administración
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Puntuación
            </h1>

            <p className="mt-2 text-slate-400">
              {tournament.name}
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href={`/admin/tournaments/${tournament.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Resumen
            </Link>

            <Link
              href={`/admin/tournaments/${tournament.id}/matches`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Partidos
            </Link>

            <Link
              href={`/admin/tournaments/${tournament.id}/participants`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Participantes
            </Link>

            <Link
              href={`/admin/tournaments/${tournament.id}/ranking`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Ranking
            </Link>

          </div>

        </div>

        {/* Resumen */}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Partidos
            </p>

            <p className="mt-2 text-3xl font-black">
              {matches.length}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              seleccionados en la Polla
            </p>

          </article>

          <article className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Finalizados
            </p>

            <p className="mt-2 text-3xl font-black">
              {finishedMatches}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              partidos con resultado
            </p>

          </article>

          <article className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Pendientes
            </p>

            <p className="mt-2 text-3xl font-black">
              {pendingScoring}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              pendientes de procesar
            </p>

          </article>

        </section>

        {/* Mensajes */}

        {error && (

          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-950/20 px-5 py-4 text-sm font-semibold text-red-300">
            {error}
          </div>

        )}

        {success && (

          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-5 py-4 text-sm font-semibold text-emerald-300">
            {success}
          </div>

        )}

        {/* Sincronización */}

        <section className="mb-6 rounded-3xl border border-blue-500/20 bg-blue-950/20 p-6 shadow-2xl">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                API-Sports
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                Actualizar resultados
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Consulta los resultados actuales de Liga MX {tournament.season}, actualiza los partidos almacenados y calcula automáticamente los puntos de los encuentros finalizados.
              </p>

              {lastSync && (
                <p className="mt-3 text-xs font-semibold text-blue-300">
                  Última sincronización:{" "}
                  {lastSync.toLocaleTimeString(
                    "es-CO",
                  )}
                </p>
              )}

            </div>

            <button
              type="button"
              disabled={
                syncing ||
                scoringMatchId !==
                null
              }
              onClick={
                handleSyncResults
              }
              className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing
                ? "Sincronizando..."
                : "Actualizar resultados"}
            </button>

          </div>

        </section>

        {/* Procesamiento manual */}

        <section className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-xl font-black">
              Procesar resultados
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Ejecuta el cálculo de puntos para los partidos que ya finalizaron.
            </p>

          </div>

          <button
            type="button"
            disabled={
              scoringMatchId !==
              null ||
              syncing
            }
            onClick={
              handleScoreAllFinished
            }
            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scoringMatchId !==
              null
              ? "Procesando..."
              : "Puntuar finalizados"}
          </button>

        </section>

        {/* Partidos */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl">

          <div className="border-b border-white/10 px-6 py-5">

            <h2 className="text-xl font-black">
              Partidos de la Polla
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Estado de resultados y puntuación.
            </p>

          </div>

          <div className="divide-y divide-white/5">

            {matches.map(
              (
                match,
                index,
              ) => {

                const finished =
                  match.finished;

                const hasResult =
                  match.homeScore !== null &&
                  match.homeScore !== undefined &&
                  match.awayScore !== null &&
                  match.awayScore !== undefined;

                const processed =
                  scoredMatches[
                  match.id
                  ];

                const processing =
                  scoringMatchId ===
                  match.id;

                return (
                  <article
                    key={
                      match.id
                    }
                    className="p-6"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex items-center gap-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-300">
                          {index + 1}
                        </div>

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                            Partido {index + 1}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(
                              match.date,
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row">

                        <div className="text-center sm:text-right">

                          <p className="font-black text-white">
                            {
                              match.homeTeam.name
                            }
                          </p>

                        </div>

                        <div className="min-w-[100px] rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-3 text-center">

                          {hasResult ? (

                            <p className="text-2xl font-black">

                              {
                                match.homeScore
                              }

                              <span className="mx-2 text-slate-600">
                                -
                              </span>

                              {
                                match.awayScore
                              }

                            </p>

                          ) : (

                            <p className="text-sm font-bold text-slate-600">
                              Sin resultado
                            </p>

                          )}

                        </div>

                        <div className="text-center">

                          <p className="font-black text-white">
                            {
                              match.awayTeam.name
                            }
                          </p>

                        </div>

                      </div>

                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">

                        {processed ? (

                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-xs font-black text-emerald-400">
                            ✓ Puntuado
                          </span>

                        ) : finished &&
                          hasResult ? (

                          <button
                            type="button"
                            disabled={
                              scoringMatchId !==
                              null ||
                              syncing
                            }
                            onClick={() =>
                              handleScoreMatch(
                                match,
                              )
                            }
                            className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processing
                              ? "Procesando..."
                              : "Calcular puntos"}
                          </button>

                        ) : (

                          <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-4 py-2 text-center text-xs font-bold text-slate-500">
                            Pendiente de resultado
                          </span>

                        )}

                      </div>

                    </div>

                  </article>
                );
              },
            )}

          </div>

        </section>

      </div>

    </main>
  );
}