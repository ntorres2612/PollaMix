"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import PlayerClaimForm from "@/components/claims/PlayerClaimForm";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import { getCurrentUser, logout } from "@/lib/auth";

import {
  getMyTournamentHistory,
  getTournamentMyStatus,
  Tournament,
  TournamentParticipationStatus,
} from "@/lib/tournaments";

import {
  findPrediction,
  getMyPredictions,
  getPredictionMatches,
  PlayerPrediction,
  SelectedPredictionMatch,
} from "@/lib/prediction-flow";

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

export default function PredictionResultsPage() {
  const router = useRouter();

  const [
    tournament,
    setTournament,
  ] =
    useState<Tournament | null>(
      null,
    );

  const [tournaments, setTournaments] =
    useState<Tournament[]>([]);

  const [selectedTournamentId, setSelectedTournamentId] =
    useState<number | null>(null);

  const [
    tournamentStatus,
    setTournamentStatus,
  ] =
    useState<TournamentParticipationStatus | null>(
      null,
    );

  const [
    matches,
    setMatches,
  ] =
    useState<SelectedPredictionMatch[]>(
      [],
    );

  const [
    predictions,
    setPredictions,
  ] =
    useState<PlayerPrediction[]>(
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

  useEffect(() => {
    let active = true;

    const user = getCurrentUser();

    if (!user) {
      router.replace("/login");
      return () => {
        active = false;
      };
    }

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const history = await getMyTournamentHistory();

        if (!active) return;

        setTournaments(history);

        const chosen =
          history.find(
            (item) => item.id === selectedTournamentId,
          ) ?? (selectedTournamentId === null ? history[0] : null);

        if (!chosen) {
          setTournament(null);
          setTournamentStatus(null);
          setMatches([]);
          setPredictions([]);
          return;
        }

        const [status, selectedMatches, myPredictions] =
          await Promise.all([
            getTournamentMyStatus(chosen.id),
            getPredictionMatches(chosen.id),
            getMyPredictions(),
          ]);

        if (!active) return;

        setTournament(chosen);
        setTournamentStatus(status);
        setMatches(selectedMatches);

        const selectedMatchIds = new Set(
          selectedMatches.map((match) => match.id),
        );

        setPredictions(
          myPredictions.filter(
            (prediction) =>
              prediction.tournamentId === chosen.id &&
              selectedMatchIds.has(prediction.matchId),
          ),
        );
      } catch (err) {
        if (!active) return;

        const message =
          err instanceof Error
            ? err.message
            : "No fue posible cargar los resultados.";

        if (
          message === "Unauthorized" ||
          message.toLowerCase().includes("jwt expired")
        ) {
          logout();
          router.replace("/login");
          return;
        }

        setError(message);
        setTournament(null);
        setTournamentStatus(null);
        setMatches([]);
        setPredictions([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [router, selectedTournamentId]);

  const completedPredictions =
    predictions.length;

  const finishedMatches =
    matches.filter(
      (match) =>
        match.finished &&
        match.homeScore !== null &&
        match.homeScore !== undefined &&
        match.awayScore !== null &&
        match.awayScore !== undefined,
    ).length;

  const pendingMatches =
    matches.length -
    finishedMatches;

  const totalPoints =
    predictions.reduce(
      (sum, prediction) =>
        sum +
        (prediction.points ?? 0),
      0,
    );

  const averagePoints =
    completedPredictions > 0
      ? (
        totalPoints /
        completedPredictions
      ).toFixed(1)
      : "0.0";

  const predictionByMatch =
    useMemo(() => {
      const map =
        new Map<
          number,
          PlayerPrediction
        >();

      for (
        const prediction of
        predictions
      ) {
        map.set(
          prediction.matchId,
          prediction,
        );
      }

      return map;
    }, [
      predictions,
    ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#071321] text-white">
        <Header />

        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <p className="text-slate-400">
            Cargando resultados...
          </p>
        </div>

        <Footer />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-[#071321] text-white">
        <Header />

        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
              PollaMix
            </p>

            <h1 className="mt-3 text-3xl font-black">
              {error
                ? "No fue posible cargar tus Pollas"
                : "No tienes Pollas registradas"}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              {error ||
                "No encontramos Pollas asociadas a tu cuenta."}
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500"
            >
              Volver al inicio
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Encabezado */}

        <div className="mb-8">
          <Link
            href="/pronosticos"
            className="text-sm font-semibold text-slate-400 transition hover:text-red-400"
          >
            ← Volver a mis pronósticos
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-400">
            Mi Polla
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Mis resultados
          </h1>

          <p className="mt-2 text-slate-400">
            {tournament.name}
          </p>
        </div>

        {/* Selección de Polla propia */}

        {tournaments.length > 1 && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <label
              htmlFor="results-tournament"
              className="block text-sm font-bold text-white"
            >
              Seleccionar mi Polla
            </label>

            <select
              id="results-tournament"
              value={selectedTournamentId ?? tournament?.id ?? ""}
              onChange={(event) =>
                setSelectedTournamentId(Number(event.target.value))
              }
              className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"
            >
              {tournaments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Estado */}

        {!tournamentStatus?.isParticipant ? (
          <section className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-950/20 p-8">
            <h2 className="text-2xl font-black">
              No estás inscrito en esta Polla
            </h2>

            <p className="mt-3 text-slate-300">
              Debes inscribirte antes de consultar tus resultados.
            </p>

            <Link
              href="/pago"
              className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500"
            >
              Ir a inscripción
            </Link>
          </section>
        ) : null}

        {/* Tarjetas resumen */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <article className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">
              Puntos
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {totalPoints}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              acumulados
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pronósticos
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {completedPredictions}
              <span className="text-slate-500">
                /{matches.length}
              </span>
            </p>

            <p className="mt-1 text-sm text-slate-400">
              registrados
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Finalizados
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {finishedMatches}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              con resultado
            </p>
          </article>

          <article className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Promedio
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {averagePoints}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              puntos por pronóstico
            </p>
          </article>

        </section>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-950/20 px-5 py-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* Estado del torneo */}

        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Estado del torneo
              </p>

              <p className="mt-2 font-bold text-white">
                {pendingMatches > 0
                  ? `${pendingMatches} partido(s) todavía no tienen resultado final.`
                  : "Todos los partidos tienen resultado final."}
              </p>
            </div>

            <Link
              href="/clasificacion"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              Ver clasificación
            </Link>

          </div>

        </section>

        {/* Reclamaciones */}

        {tournamentStatus?.isParticipant && (
          <PlayerClaimForm tournamentId={tournament.id} />
        )}

        {/* Resultados */}

        <section className="space-y-4">

          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">
                Partidos
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Comparación entre tu pronóstico y el resultado real.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
              {matches.length} partidos
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center">
              <h3 className="text-xl font-black">
                No hay partidos seleccionados
              </h3>

              <p className="mt-2 text-slate-400">
                El administrador todavía no ha configurado los partidos de esta Polla.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {matches.map(
                (
                  match,
                  index,
                ) => {
                  const prediction =
                    predictionByMatch.get(
                      match.id,
                    );

                  const hasResult =
                    match.finished &&
                    match.homeScore !== null &&
                    match.homeScore !== undefined &&
                    match.awayScore !== null &&
                    match.awayScore !== undefined;

                  return (
                    <article
                      key={match.id}
                      className={[
                        "rounded-3xl border bg-slate-900/70 p-5 shadow-xl",
                        hasResult
                          ? "border-white/10"
                          : "border-amber-500/10",
                      ].join(" ")}
                    >

                      {/* Cabecera */}

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-300">
                            {index + 1}
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                              Partido {index + 1}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(
                                match.date,
                              )}
                            </p>
                          </div>

                        </div>

                        {hasResult ? (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                            Finalizado
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                            Pendiente
                          </span>
                        )}

                      </div>

                      {/* Partido */}

                      <div className="mt-6 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">

                        <div className="flex items-center gap-3 md:justify-end">

                          {match.homeTeam.logo && (
                            <img
                              src={
                                match.homeTeam.logo
                              }
                              alt={
                                match.homeTeam.name
                              }
                              className="h-11 w-11 object-contain"
                            />
                          )}

                          <div className="md:text-right">
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Local
                            </p>

                            <p className="font-black text-white">
                              {
                                match.homeTeam.name
                              }
                            </p>
                          </div>

                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-3 text-center">

                          {hasResult ? (
                            <p className="text-2xl font-black text-white">
                              {match.homeScore}
                              <span className="mx-2 text-slate-600">
                                -
                              </span>
                              {match.awayScore}
                            </p>
                          ) : (
                            <p className="font-bold text-slate-600">
                              -
                            </p>
                          )}

                        </div>

                        <div className="flex items-center gap-3">

                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Visitante
                            </p>

                            <p className="font-black text-white">
                              {
                                match.awayTeam.name
                              }
                            </p>
                          </div>

                          {match.awayTeam.logo && (
                            <img
                              src={
                                match.awayTeam.logo
                              }
                              alt={
                                match.awayTeam.name
                              }
                              className="h-11 w-11 object-contain"
                            />
                          )}

                        </div>

                      </div>

                      {/* Comparación */}

                      <div className="mt-6 grid gap-4 border-t border-white/5 pt-5 sm:grid-cols-2">

                        <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">

                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Mi pronóstico
                          </p>

                          {prediction ? (
                            <p className="mt-2 text-2xl font-black text-white">
                              {tournamentStatus?.predictionsCloseAt !== null &&
                              tournamentStatus?.predictionsCloseAt !== undefined
                                ? prediction.homeScore > prediction.awayScore
                                  ? "Local"
                                  : prediction.homeScore < prediction.awayScore
                                    ? "Visitante"
                                    : "Empate"
                                : `${prediction.homeScore} - ${prediction.awayScore}`}
                            </p>
                          ) : (
                            <p className="mt-2 font-bold text-slate-600">
                              Sin pronóstico
                            </p>
                          )}

                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">

                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Puntos
                          </p>

                          {prediction ? (
                            <p className="mt-2 text-2xl font-black text-red-400">
                              {prediction.points ?? 0}
                            </p>
                          ) : (
                            <p className="mt-2 font-bold text-slate-600">
                              -
                            </p>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                },
              )}

            </div>
          )}

        </section>

      </div>

      <Footer />
    </main>
  );
}
