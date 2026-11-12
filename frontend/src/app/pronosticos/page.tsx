"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TeamLogo from "@/components/match/TeamLogo";
import BreBPaymentCard from "@/components/payments/BreBPaymentCard";

import {
  createPayment,
  getCurrentPlayerTournament,
  getMyEntries,
  getTournamentMyStatus,
  PollEntrySummary,
  Tournament,
  TournamentParticipationStatus,
} from "@/lib/tournaments";

import {
  getPredictionMatches,
  SelectedPredictionMatch,
} from "@/lib/prediction-flow";

import { submitPredictions } from "@/lib/predictions";

import { getCurrentUser } from "@/lib/auth";
import { teamNameEs } from "@/lib/team-name";

type Outcome = "HOME" | "DRAW" | "AWAY";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "HOME", label: "Local" },
  { value: "DRAW", label: "Empate" },
  { value: "AWAY", label: "Visitante" },
];

function receiptWhatsappLink(tournamentName: string) {
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(
    /\D/g,
    "",
  );

  if (!/^[1-9]\d{7,14}$/.test(whatsappNumber)) {
    return null;
  }

  const message =
    `Hola, equipo de GolPro. Ya guardé mis pronósticos de ${tournamentName}. ` +
    "Quiero enviar mi comprobante de pago para que puedan verificar mi inscripción. " +
    "Adjunto el soporte a continuación.";

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
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
    drafts,
    setDrafts,
  ] =
    useState<
      Record<number, Outcome>
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [entries, setEntries] = useState<PollEntrySummary[]>([]);
  const [makingNew, setMakingNew] = useState(false);
  const [saving, setSaving] = useState(false);

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
      async (silent = false) => {

        try {

          if (!silent) {
            setLoading(true);
            setError("");
          }

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

            return;
          }

          const status = await getTournamentMyStatus(currentTournament.id);

          const selectedMatches = await getPredictionMatches(currentTournament.id);

          setTournamentStatus(
            status,
          );

          setMatches(
            selectedMatches,
          );

          setEntries(
            await getMyEntries(currentTournament.id),
          );

          if (!silent) {
            setDrafts({});
            setMakingNew(false);
          }

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

  const completedCount = Object.keys(drafts).length;

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

  function selectOutcome(
    matchId: number,
    outcome: Outcome,
  ) {
    setDrafts((current) => ({
      ...current,
      [matchId]: outcome,
    }));

    setSuccess("");
    setError("");
  }

  const selectedCount = matches.filter(
    (match) => drafts[match.id] !== undefined,
  ).length;

  async function handleSaveAll() {
    if (!tournament || saving) {
      return;
    }

    if (
      matches.length !== 10 ||
      selectedCount !== 10 ||
      matches.some((match) => !drafts[match.id])
    ) {
      setError(
        "Elige Local, Empate o Visitante en los 10 partidos.",
      );
      return;
    }

    if (matches.some((match) => getMatchStarted(match.date))) {
      setError(
        "Hay un partido que ya comenzó. No se pueden guardar los pronósticos.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const latestStatus = await getTournamentMyStatus(tournament.id);
      setTournamentStatus(latestStatus);

      if (!latestStatus.isParticipant) {
        setError("Debes estar inscrito en la Polla.");
        return;
      }

      const saved = await submitPredictions({
        tournamentId: tournament.id,
        predictions: matches.map((match) => {
          const selection = drafts[match.id];
          if (!selection) {
            throw new Error(
              "Elige Local, Empate o Visitante en los 10 partidos.",
            );
          }
          return { matchId: match.id, selection };
        }),
      }) as { entryId?: number };

      if (!saved.entryId) {
        throw new Error(
          "No fue posible preparar el pago de este pronóstico.",
        );
      }

      setSuccess(
        "Este pronóstico quedó guardado y pendiente de pago. Envía el comprobante.",
      );
      await openReceipt(saved.entryId);
      setMakingNew(false);
      setDrafts({});
      await loadData(true);
    } catch (err) {
      console.error("Error guardando pronósticos:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar los pronósticos.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openReceipt(entryId?: number) {
    if (!tournament) {
      return;
    }

    setReceiptOpen(true);

    try {
      await createPayment({
        tournamentId: tournament.id,
        ...(entryId ? { entryId } : {}),
      });
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "No fue posible preparar el comprobante de pago.",
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
              GolPro
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

  if (entries.length > 0 && !makingNew) {
    const deadline = new Date(tournamentStatus?.predictionsCloseAt ?? "");
    const deadlineValid = Number.isFinite(deadline.getTime());
    const predictionsClosed = deadlineValid && Date.now() >= deadline.getTime();
    const selectionText = (selection: string) =>
      selection === "HOME"
        ? "Local"
        : selection === "AWAY"
          ? "Visitante"
          : "Empate";

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
          {success && (
            <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-emerald-300">
              {success}
            </p>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pronósticos</p>
              <p className="mt-2 text-3xl font-black">{entries.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pagados</p>
              <p className="mt-2 text-3xl font-black text-emerald-400">
                {entries.filter((entry) => entry.paid).length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha límite</p>
              <p className="mt-2 font-bold">
                {deadlineValid && tournamentStatus?.predictionsCloseAt
                  ? formatDateLong(tournamentStatus.predictionsCloseAt)
                  : "No disponible"}
              </p>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-300">
              {predictionsClosed
                ? "El plazo de pronósticos está cerrado. Los marcadores ya cuentan para la clasificación."
                : "Cada pronóstico nuevo tiene su propio pago. Solo participa cuando ese pago queda aprobado."}
            </p>
            {!predictionsClosed && (
              <button
                type="button"
                onClick={() => {
                  setDrafts({});
                  setError("");
                  setSuccess("");
                  setMakingNew(true);
                }}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
              >
                Nuevo pronóstico
              </button>
            )}
          </div>

          <div className="mt-8 space-y-5">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Pronóstico {entry.number}</h2>
                    {matches.some((match) => match.finished) && (
                      <p className="mt-1 text-sm font-bold text-red-300">
                        {entry.predictions.reduce(
                          (sum, prediction) => sum + (prediction.points ?? 0),
                          0,
                        )}{" "}
                        pts
                      </p>
                    )}
                  </div>
                  <span className={
                    "rounded-full px-3 py-1 text-xs font-bold " +
                    (entry.paid
                      ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                      : "border border-amber-500/30 bg-amber-950/40 text-amber-200")
                  }>
                    {entry.paid ? "Pago aprobado" : "Pendiente de pago"}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {matches.map((match) => {
                    const pick = entry.predictions.find(
                      (prediction) => prediction.matchId === match.id,
                    );
                    return (
                      <p key={match.id} className="text-sm text-slate-300">
                        <span className="text-slate-500">{teamNameEs(match.homeTeam.name)} vs {teamNameEs(match.awayTeam.name)}: </span>
                        {pick ? selectionText(pick.selection) : "Sin selección"}
                        {match.finished && match.homeScore !== null && match.awayScore !== null
                          ? ` · ${match.homeScore}-${match.awayScore}`
                          : ""}
                      </p>
                    );
                  })}
                </div>
                {!entry.paid && (
                  <button
                    type="button"
                    onClick={() => void openReceipt(entry.id)}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500"
                  >
                    Enviar comprobante
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
        {receiptOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title-locked"
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1b2e] p-6 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                Pago pendiente
              </p>
              <h2 id="receipt-title-locked" className="mt-2 text-2xl font-black">
                Envía tu comprobante
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Este pronóstico ya está guardado. Envía el comprobante de su pago.
                Cuando el administrador lo apruebe, ese pronóstico participa.
              </p>
              <BreBPaymentCard
                amount={tournament.inscription}
                currency={tournament.currency}
              />
              {receiptWhatsappLink(tournament.name) ? (
                <a
                  href={receiptWhatsappLink(tournament.name) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-emerald-500"
                >
                  Enviar comprobante
                </a>
              ) : (
                <p className="mt-5 text-sm text-amber-200">
                  El canal para enviar el comprobante todavía no está configurado.
                </p>
              )}
              <button
                type="button"
                onClick={() => setReceiptOpen(false)}
                className="mt-3 w-full rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white hover:bg-white/5"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
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
            {makingNew && entries.length > 0
              ? "Nuevo pronóstico"
              : "Mis pronósticos"}
          </h1>

          <p className="mt-2 text-slate-400">
            {tournament.name}
          </p>

          {makingNew && entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDrafts({});
                setMakingNew(false);
              }}
              className="mt-4 text-sm font-bold text-slate-300 hover:text-white"
            >
              Volver a mis pronósticos
            </button>
          )}

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
              Elige Local, Empate o Visitante en los 10 partidos. Al guardar, este pronóstico queda pendiente y se abre el comprobante de su pago.
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

                  const draft = drafts[match.id];

                  const started =
                    getMatchStarted(
                      match.date,
                    );

                  const locked =
                    started ||
                    saving;

                  return (
                    <article
                      key={
                        match.id
                      }
                      className={[
                        "rounded-3xl border bg-slate-900/70 p-5 shadow-xl transition",
                        started
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

                        {started ? (

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

                          <TeamLogo src={match.homeTeam.logo} name={teamNameEs(match.homeTeam.name)} size="h-12 w-12" />

                          <div className="md:text-right">

                            <p className="text-xs font-bold uppercase text-slate-500">
                              Local
                            </p>

                            <p className="text-lg font-black text-white">
                              {
                                teamNameEs(match.homeTeam.name)
                              }
                            </p>

                          </div>

                        </div>

                        <div className="flex items-center justify-center">
                          <span className="text-xl font-black text-slate-500">
                            VS
                          </span>
                        </div>

                        {/* Visitante */}

                        <div className="flex items-center gap-3">

                          <div>

                            <p className="text-xs font-bold uppercase text-slate-500">
                              Visitante
                            </p>

                            <p className="text-lg font-black text-white">
                              {
                                teamNameEs(match.awayTeam.name)
                              }
                            </p>

                          </div>

                          <TeamLogo src={match.awayTeam.logo} name={teamNameEs(match.awayTeam.name)} size="h-12 w-12" />

                        </div>

                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-2">
                        {OUTCOMES.map((option) => {
                          const selected = draft === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={locked}
                              aria-pressed={selected}
                              onClick={() =>
                                selectOutcome(match.id, option.value)
                              }
                              className={[
                                "rounded-xl border px-3 py-3 text-sm font-black transition",
                                selected
                                  ? "border-red-500 bg-red-600 text-white"
                                  : "border-white/10 bg-slate-950 text-slate-300 hover:border-red-500",
                                "disabled:cursor-not-allowed disabled:opacity-60",
                              ].join(" ")}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Información / acción */}

                      <div className="mt-6 flex flex-col gap-4 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          {started ? (

                            <p className="text-sm text-slate-500">
                              El partido ya comenzó. El pronóstico está cerrado.
                            </p>

                          ) : (

                            <p className="text-sm text-slate-500">
                              Elige si gana el local, empatan o gana el visitante.
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

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center">
              <p className="text-lg font-black">
                {selectedCount} / {matches.length} resultados elegidos
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Elige Local, Empate o Visitante en todos los partidos y guarda una sola vez. Este pronóstico tiene su propio pago.
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAll()}
                className="mt-5 rounded-xl bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar pronósticos"}
              </button>
            </div>

        </section>

        {/* Pie */}

        <section className="mt-8 rounded-3xl border border-blue-500/20 bg-blue-950/20 p-6">

          <h3 className="font-black text-blue-200">
            ¿Cómo funciona?
          </h3>

          <p className="mt-2 text-sm leading-6 text-blue-200/70">
            En cada partido elige si gana el local, empatan o gana el visitante. Al guardar, los 10 pronósticos quedan pendientes y se abre el comprobante de pago. Cuando el pago se aprueba, participas.
          </p>

        </section>

      </div>

      {receiptOpen && tournament && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1b2e] p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Pago pendiente
            </p>
            <h2 id="receipt-title" className="mt-2 text-2xl font-black">
              Envía tu comprobante
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Tus 10 pronósticos quedaron guardados en estado pendiente.
              Envía el comprobante de pago. Cuando el administrador lo apruebe, participas.
            </p>

            <BreBPaymentCard
              amount={tournament.inscription}
              currency={tournament.currency}
            />

            {receiptWhatsappLink(tournament.name) ? (
              <a
                href={receiptWhatsappLink(tournament.name) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-emerald-500"
              >
                Enviar comprobante
              </a>
            ) : (
              <p className="mt-5 text-sm text-amber-200">
                El canal para enviar el comprobante todavía no está configurado.
              </p>
            )}

            <button
              type="button"
              onClick={() => setReceiptOpen(false)}
              className="mt-3 w-full rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white hover:bg-white/5"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <Footer />

    </main>
  );
}
