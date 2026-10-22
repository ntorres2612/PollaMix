"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import {
  getCurrentPlayerTournament,
  getTournamentMyStatus,
  Tournament,
  TournamentParticipationStatus,
} from "@/lib/tournaments";

import {
  createPlayerPrediction,
  findPrediction,
  getMyPredictions,
  getPredictionMatches,
  PlayerPrediction,
  SelectedPredictionMatch,
} from "@/lib/prediction-flow";

import { getCurrentUser } from "@/lib/auth";

interface ScoreDraft {
  home: string;

  away: string;
}

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

function formatDateLong(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

function getMatchStarted(
  date: string,
) {
  return (
    new Date(date).getTime() <=
    Date.now()
  );
}


function TeamLogo({
  src,
  name,
  size = "h-10 w-10",
}: {
  src?: string | null;
  name: string;
  size?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={`Equipo: ${name}`}
        className={`${size} flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-xl`}
      >
        ⚽
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`Escudo de ${name}`}
      className={`${size} shrink-0 object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

export default function PredictionsPage() {

  const router =
    useRouter();

  const [
    tournament,
    setTournament,
  ] =
    useState<Tournament | null>(
      null,
    );

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
    drafts,
    setDrafts,
  ] =
    useState<
      Record<
        number,
        ScoreDraft
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    savingMatchId,
    setSavingMatchId,
  ] =
    useState<number | null>(
      null,
    );

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

  const loadData =
    useCallback(
      async () => {

        try {

          setLoading(true);
          setError("");

          const currentTournament =
            await getCurrentPlayerTournament();

          setTournament(
            currentTournament,
          );

          if (!currentTournament) {
            setTournamentStatus(
              null,
            );

            setMatches([]);
            setPredictions([]);

            return;
          }

          const status = await getTournamentMyStatus(currentTournament.id);

          const [selectedMatches, myPredictions] = await Promise.all([
            getPredictionMatches(currentTournament.id),
            getMyPredictions(),
          ]);

          setTournamentStatus(
            status,
          );

          setMatches(
            selectedMatches,
          );

          const tournamentPredictions =
            myPredictions.filter(
              (prediction) =>
                prediction.tournamentId ===
                currentTournament.id,
            );

          setPredictions(
            tournamentPredictions,
          );

          /*
           * Cargar los pronósticos existentes
           * dentro de los inputs.
           */
          const initialDrafts: Record<
            number,
            ScoreDraft
          > = {};

          for (
            const prediction of
              tournamentPredictions
          ) {

            initialDrafts[
              prediction.matchId
            ] = {
              home:
                String(
                  prediction.homeScore,
                ),

              away:
                String(
                  prediction.awayScore,
                ),
            };

          }

          setDrafts(
            initialDrafts,
          );

        } catch (err) {

          console.error(
            "Error cargando pronósticos:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar los pronósticos.",
          );

        } finally {

          setLoading(false);

        }

      },
      [],
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

    loadData();

  }, [
    router,
    loadData,
  ]);

  const completedCount =
    useMemo(
      () =>
        predictions.length,

      [predictions],
    );

  const totalMatches =
    matches.length;

  const progressPercentage =
    totalMatches >
    0
      ? Math.round(
          (completedCount /
            totalMatches) *
            100,
        )
      : 0;

  function updateDraft(
    matchId: number,
    side: "home" | "away",
    value: string,
  ) {

    /*
     * Permitir únicamente números enteros
     * no negativos.
     */
    if (
      value !== "" &&
      !/^\d+$/.test(
        value,
      )
    ) {
      return;
    }

    setDrafts(
      (
        current,
      ) => ({
        ...current,

        [matchId]: {
          home:
            current[
              matchId
            ]?.home ?? "",

          away:
            current[
              matchId
            ]?.away ?? "",

          [side]:
            value,
        },
      }),
    );

    setSuccess("");
    setError("");
  }

  async function handleSavePrediction(
    match: SelectedPredictionMatch,
  ) {

    if (
      !tournament ||
      !tournamentStatus
    ) {
      return;
    }

    if (
      !tournamentStatus.isParticipant
    ) {

      setError(
        "Debes estar inscrito en la Polla.",
      );

      return;
    }

    if (
      !tournamentStatus.paid
    ) {

      setError(
        "Tu inscripción todavía no está pagada o aprobada.",
      );

      return;
    }

    if (
      getMatchStarted(
        match.date,
      )
    ) {

      setError(
        "Este partido ya comenzó y no se puede registrar el pronóstico.",
      );

      return;
    }

    const existing =
      findPrediction(
        predictions,
        match.id,
        tournament.id,
      );

    if (existing) {

      setError(
        "Ya existe un pronóstico para este partido.",
      );

      return;
    }

    const draft =
      drafts[match.id];

    if (
      !draft ||
      draft.home === "" ||
      draft.away === ""
    ) {

      setError(
        "Debes ingresar los dos marcadores.",
      );

      return;
    }

    const homeScore =
      Number(
        draft.home,
      );

    const awayScore =
      Number(
        draft.away,
      );

    if (
      !Number.isInteger(
        homeScore,
      ) ||
      !Number.isInteger(
        awayScore,
      ) ||
      homeScore < 0 ||
      awayScore < 0
    ) {

      setError(
        "Los marcadores deben ser números enteros no negativos.",
      );

      return;
    }

    try {

      setSavingMatchId(
        match.id,
      );

      setError("");
      setSuccess("");

      const prediction =
        await createPlayerPrediction(
          {
            matchId:
              match.id,

            tournamentId:
              tournament.id,

            homeScore,

            awayScore,
          },
        );

      setPredictions(
        (
          current,
        ) => [
          ...current,
          prediction,
        ],
      );

      setSuccess(
        `${match.homeTeam.name} vs ${match.awayTeam.name}: pronóstico guardado correctamente.`,
      );

    } catch (err) {

      console.error(
        "Error guardando pronóstico:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar el pronóstico.",
      );

    } finally {

      setSavingMatchId(
        null,
      );

    }
  }

  if (loading) {

    return (
      <main className="min-h-screen bg-[#071321] text-white">

        <Header />

        <div className="mx-auto max-w-5xl px-4 py-20 text-center">

          <p className="text-slate-400">
            Cargando tus pronósticos...
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
              No tienes una Polla activa
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              No encontramos una Polla activa asociada a tu cuenta.
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

  // Las Pollas nuevas presentan selecciones 1X2 en su propia página.
  // El formulario histórico de marcadores se mantiene sin cambios más abajo.
  if (tournamentStatus?.predictionsCloseAt != null) {
    const submitted = Boolean(tournamentStatus.predictionsSubmittedAt);
    const deadline = new Date(tournamentStatus.predictionsCloseAt);
    const deadlineValid = Number.isFinite(deadline.getTime());
    const deadlinePassed = !deadlineValid || Date.now() >= deadline.getTime();

    const selectionLabel = (prediction: PlayerPrediction | undefined) => {
      if (!prediction) return "Sin selección";
      if (prediction.homeScore > prediction.awayScore) return "Local";
      if (prediction.homeScore < prediction.awayScore) return "Visitante";
      return "Empate";
    };

    return (
      <main className="min-h-screen bg-[#071321] text-white">
        <Header />
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
            Mi Polla
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Mis pronósticos</h1>
          <p className="mt-2 text-slate-400">{tournament.name}</p>

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-300">
              {error}
            </p>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pronósticos</p>
              <p className="mt-2 text-3xl font-black">{predictions.length}/{matches.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado</p>
              <p className={"mt-2 font-bold " + (submitted ? "text-emerald-400" : "text-amber-400")}>
                {submitted ? "Confirmados definitivamente" : "Pendientes de confirmar"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha límite</p>
              <p className="mt-2 font-bold">
                {deadlineValid ? formatDateLong(tournamentStatus.predictionsCloseAt) : "No disponible"}
              </p>
            </div>
          </section>

          {submitted ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 text-emerald-300">
              Tus selecciones fueron enviadas y no pueden modificarse.
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">
              <p className="font-semibold text-amber-200">
                {deadlinePassed
                  ? "El plazo para enviar pronósticos ha finalizado."
                  : !tournamentStatus.paid
                    ? "Pronósticos bloqueados: necesitas un pago aprobado para participar."
                    : "Tus pronósticos todavía no están confirmados."}
              </p>
              {!deadlinePassed && tournamentStatus.paid && (
                <Link
                  href="/"
                  className="mt-4 inline-flex rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500"
                >
                  Seleccionar y confirmar los 10 partidos
                </Link>
              )}
              {!tournamentStatus.paid && (
                <Link href="/pago" className="mt-3 inline-block font-bold text-red-300 underline">
                  Consultar mi pago
                </Link>
              )}
            </div>
          )}

          <div className="mt-9 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Partidos de la Polla</h2>
            <Link href="/pronosticos/resultados" className="text-sm font-bold text-red-300 hover:text-red-200">
              Ver mis resultados →
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-slate-300">
              No hay partidos disponibles para esta Polla.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {matches.map((match, index) => {
                const prediction = findPrediction(predictions, match.id, tournament.id);
                const selected = selectionLabel(prediction);
                return (
                  <article key={match.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Partido {index + 1}
                      </p>
                      <p className="text-sm text-slate-400">{formatDate(match.date)}</p>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-center">
                      <div className="flex flex-1 items-center justify-center gap-3">
                        <TeamLogo src={match.homeTeam.logo} name={match.homeTeam.name} size="h-10 w-10" />
                        <span className="font-bold">{match.homeTeam.name}</span>
                      </div>
                      <span className="font-black text-slate-500">VS</span>
                      <div className="flex flex-1 items-center justify-center gap-3">
                        <span className="font-bold">{match.awayTeam.name}</span>
                        <TeamLogo src={match.awayTeam.logo} name={match.awayTeam.name} size="h-10 w-10" />
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {(["Local", "Empate", "Visitante"] as const).map((option) => (
                        <div
                          key={option}
                          className={
                            "rounded-xl border px-3 py-3 text-center text-sm font-bold " +
                            (prediction && selected === option
                              ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                              : "border-white/10 bg-slate-950/40 text-slate-500")
                          }
                        >
                          {option}{prediction && selected === option ? " ✓" : ""}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-400">
                      {prediction
                        ? submitted ? "Selección confirmada y bloqueada" : "Selección registrada"
                        : "Sin pronóstico registrado"}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
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
            href="/jornadas"
            className="text-sm font-semibold text-slate-400 transition hover:text-red-400"
          >
            ← Volver a jornadas
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-400">
            Mi Polla
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Mis pronósticos
          </h1>

          <p className="mt-2 text-slate-400">
            {tournament.name}
          </p>

        </div>

        {/* Acceso */}

        {tournamentStatus &&
        !tournamentStatus.isParticipant ? (

          <section className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-950/20 p-8">

            <h2 className="text-2xl font-black">
              Aún no estás inscrito
            </h2>

            <p className="mt-3 text-slate-300">
              Primero debes inscribirte en la Polla.
            </p>

            <Link
              href="/pago"
              className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500"
            >
              Ir a inscripción
            </Link>

          </section>

        ) : tournamentStatus &&
          !tournamentStatus.paid ? (

          <section className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-950/20 p-8">

            <h2 className="text-2xl font-black">
              Pago pendiente
            </h2>

            <p className="mt-3 text-slate-300">
              Debes tener el pago aprobado antes de registrar tus pronósticos.
            </p>

            <Link
              href="/pago"
              className="mt-6 inline-flex rounded-xl border border-amber-400/30 bg-amber-500/10 px-6 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-500/20"
            >
              Ver estado del pago
            </Link>

          </section>

        ) : null}

        {/* Progreso */}

        <section className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Progreso
              </p>

              <h2 className="mt-2 text-3xl font-black">
                {completedCount}
                <span className="text-slate-500">
                  /{totalMatches}
                </span>
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                pronósticos registrados
              </p>

            </div>

            <div className="sm:text-right">

              <p className="text-2xl font-black text-red-400">
                {progressPercentage}%
              </p>

              <p className="text-xs text-slate-500">
                completado
              </p>

            </div>

          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950">

            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
              style={{
                width: `${progressPercentage}%`,
              }}
            />

          </div>

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

        {/* Partidos */}

        <section className="space-y-5">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-2xl font-black">
                Partidos de la Polla
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Seleccionados por el administrador.
              </p>

            </div>

            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
              {totalMatches} partidos
            </span>

          </div>

          {matches.length === 0 ? (

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center">

              <h3 className="text-xl font-black">
                Todavía no hay partidos seleccionados
              </h3>

              <p className="mt-2 text-slate-400">
                El administrador aún no ha configurado los partidos de esta Polla.
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
                    findPrediction(
                      predictions,
                      match.id,
                      tournament.id,
                    );

                  const draft =
                    drafts[match.id] ??
                    {
                      home: "",
                      away: "",
                    };

                  const started =
                    getMatchStarted(
                      match.date,
                    );

                  const saving =
                    savingMatchId ===
                    match.id;

                  const locked =
                    started ||
                    Boolean(
                      prediction,
                    ) ||
                    !tournamentStatus?.paid;

                  return (
                    <article
                      key={
                        match.id
                      }
                      className={[
                        "rounded-3xl border bg-slate-900/70 p-5 shadow-xl transition",
                        prediction
                          ? "border-emerald-500/20"
                          : started
                            ? "border-white/5 opacity-80"
                            : "border-white/10 hover:border-red-500/20",
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

                            <p className="mt-1 text-sm text-slate-400">
                              {formatDate(
                                match.date,
                              )}
                            </p>

                          </div>

                        </div>

                        {prediction ? (

                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                            ✓ Guardado
                          </span>

                        ) : started ? (

                          <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-bold text-slate-400">
                            Cerrado
                          </span>

                        ) : (

                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                            Pendiente
                          </span>

                        )}

                      </div>

                      {/* Equipos */}

                      <div className="mt-6 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">

                        {/* Local */}

                        <div className="flex items-center gap-3 md:justify-end">

                          <TeamLogo src={match.homeTeam.logo} name={match.homeTeam.name} size="h-12 w-12" />

                          <div className="md:text-right">

                            <p className="text-xs font-bold uppercase text-slate-500">
                              Local
                            </p>

                            <p className="text-lg font-black text-white">
                              {
                                match.homeTeam.name
                              }
                            </p>

                          </div>

                        </div>

                        {/* Marcadores */}

                        <div className="flex items-center justify-center gap-3">

                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={
                              draft.home
                            }
                            disabled={
                              locked
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                match.id,
                                "home",
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-14 w-16 rounded-2xl border border-white/10 bg-slate-950 text-center text-2xl font-black text-white outline-none transition focus:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                          />

                          <span className="text-xl font-black text-slate-600">
                            -
                          </span>

                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={
                              draft.away
                            }
                            disabled={
                              locked
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                match.id,
                                "away",
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-14 w-16 rounded-2xl border border-white/10 bg-slate-950 text-center text-2xl font-black text-white outline-none transition focus:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                          />

                        </div>

                        {/* Visitante */}

                        <div className="flex items-center gap-3">

                          <div>

                            <p className="text-xs font-bold uppercase text-slate-500">
                              Visitante
                            </p>

                            <p className="text-lg font-black text-white">
                              {
                                match.awayTeam.name
                              }
                            </p>

                          </div>

                          <TeamLogo src={match.awayTeam.logo} name={match.awayTeam.name} size="h-12 w-12" />

                        </div>

                      </div>

                      {/* Información / acción */}

                      <div className="mt-6 flex flex-col gap-4 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          {prediction ? (

                            <p className="text-sm text-emerald-300">

                              Pronóstico:
                              {" "}
                              <span className="font-black">
                                {
                                  prediction.homeScore
                                }
                                {" - "}
                                {
                                  prediction.awayScore
                                }
                              </span>

                            </p>

                          ) : started ? (

                            <p className="text-sm text-slate-500">
                              El partido ya comenzó. El pronóstico está cerrado.
                            </p>

                          ) : (

                            <p className="text-sm text-slate-500">
                              Ingresa el marcador que crees que tendrá el partido.
                            </p>

                          )}

                        </div>

                        {!prediction &&
                        !started &&
                        tournamentStatus?.paid ? (

                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              handleSavePrediction(
                                match,
                              )
                            }
                            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving
                              ? "Guardando..."
                              : "Guardar pronóstico"}
                          </button>

                        ) : null}

                      </div>

                      {/* Puntos */}

                      {prediction && (

                        <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">

                          <div className="flex justify-between text-sm">

                            <span className="text-slate-500">
                              Puntos
                            </span>

                            <span className="font-black text-white">
                              {prediction.points ??
                                0}
                            </span>

                          </div>

                        </div>

                      )}

                    </article>
                  );
                },
              )}

            </div>

          )}

        </section>

        {/* Pie */}

        <section className="mt-8 rounded-3xl border border-blue-500/20 bg-blue-950/20 p-6">

          <h3 className="font-black text-blue-200">
            ¿Cómo funciona?
          </h3>

          <p className="mt-2 text-sm leading-6 text-blue-200/70">
            Debes registrar un marcador para cada uno de los partidos seleccionados. Una vez iniciado un partido, su pronóstico queda cerrado.
          </p>

        </section>

      </div>

      <Footer />

    </main>
  );
}
