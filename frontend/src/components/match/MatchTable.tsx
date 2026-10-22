"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Container from "@/components/ui/Container";
import PredictionProgress from "@/components/dashboard/PredictionProgress";
import MatchWeek from "./MatchWeek";

import { ApiMatch } from "@/types/match";

import {
  getSelectedTournamentMatches,
  getTournamentMyStatus,
} from "@/lib/tournaments";

import {
  getPredictions,
  submitPredictions,
  type PredictionSelection,
} from "@/lib/predictions";

interface MatchTableProps {
  tournamentId: number;
  canPredict: boolean;
  predictionsCloseAt: string | null;
  predictionsSubmittedAt: string | null;
  onSubmitted: () => Promise<void>;
}

function getSelection(
  homeScore: number,
  awayScore: number,
): PredictionSelection {
  if (homeScore > awayScore) return "HOME";
  if (homeScore < awayScore) return "AWAY";
  return "DRAW";
}

export default function MatchTable({
  tournamentId,
  canPredict,
  predictionsCloseAt,
  predictionsSubmittedAt,
  onSubmitted,
}: MatchTableProps) {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [selections, setSelections] = useState<
    Record<number, PredictionSelection>
  >({});

  const [submittedAt, setSubmittedAt] = useState<string | null>(
    predictionsSubmittedAt,
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setSubmittedAt(predictionsSubmittedAt);
  }, [predictionsSubmittedAt]);

  useEffect(() => {
    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await getSelectedTournamentMatches(tournamentId);

      setMatches(data);
      setSelections({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los partidos.",
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (!submittedAt || matches.length === 0) return;

    let cancelled = false;

    async function loadConfirmedPredictions() {
      try {
        const predictions = await getPredictions();

        if (cancelled) return;

        const selectedMatchIds = new Set(
          matches.map((match) => match.id),
        );

        const confirmed: Record<number, PredictionSelection> = {};

        for (const prediction of predictions) {
          if (
            prediction.tournamentId === tournamentId &&
            selectedMatchIds.has(prediction.matchId)
          ) {
            confirmed[prediction.matchId] = getSelection(
              prediction.homeScore,
              prediction.awayScore,
            );
          }
        }

        setSelections(confirmed);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible consultar los pronósticos confirmados.",
          );
        }
      }
    }

    void loadConfirmedPredictions();

    return () => {
      cancelled = true;
    };
  }, [submittedAt, matches, tournamentId]);

  const grouped = useMemo(() => {
    return matches.reduce<Record<string, ApiMatch[]>>(
      (groups, match) => {
        const week =
          match.matchday?.number != null
            ? `Jornada ${match.matchday.number}`
            : match.matchday?.roundName ||
            "Próximos partidos";

        if (!groups[week]) {
          groups[week] = [];
        }

        groups[week].push(match);

        return groups;
      },
      {},
    );
  }, [matches]);

  const selectedCount = matches.filter(
    (match) => selections[match.id] !== undefined,
  ).length;

  const deadlinePassed =
    now !== null &&
    predictionsCloseAt !== null &&
    now >= new Date(predictionsCloseAt).getTime();

  const anyMatchStarted =
    now !== null &&
    matches.some(
      (match) =>
        match.finished ||
        new Date(match.date).getTime() <= now,
    );

  const isConfirmed = submittedAt !== null;

  const canEdit =
    canPredict &&
    predictionsCloseAt !== null &&
    !isConfirmed &&
    !deadlinePassed &&
    !anyMatchStarted &&
    !submitting;

  const readyToSubmit =
    canEdit &&
    matches.length === 10 &&
    selectedCount === 10;

  function handleSelectionChange(
    matchId: number,
    selection: PredictionSelection,
  ) {
    if (!canEdit) return;

    setSelections((previous) => ({
      ...previous,
      [matchId]: selection,
    }));

    setError("");
    setMessage("");
  }

  async function handleSubmit() {
    if (!readyToSubmit || submitting) return;

    setSubmitting(true);
    setConfirming(false);
    setError("");
    setMessage("");

    try {
      // Consultar el estado más reciente antes de enviar.
      const currentStatus =
        await getTournamentMyStatus(tournamentId);

      if (!currentStatus.isParticipant || !currentStatus.paid) {
        throw new Error(
          "Tu pago debe estar aprobado para confirmar los pronósticos.",
        );
      }

      if (currentStatus.predictionsSubmittedAt) {
        setSubmittedAt(currentStatus.predictionsSubmittedAt);

        throw new Error(
          "Tus pronósticos ya fueron confirmados anteriormente.",
        );
      }

      const deadline = currentStatus.predictionsCloseAt;

      if (
        !deadline ||
        Date.now() >= new Date(deadline).getTime()
      ) {
        throw new Error(
          "El plazo para confirmar pronósticos ha terminado.",
        );
      }

      await submitPredictions({
        tournamentId,
        predictions: matches.map((match) => ({
          matchId: match.id,
          selection: selections[match.id],
        })),
      });

      // Bloqueo inmediato mientras se actualiza el estado.
      setSubmittedAt(new Date().toISOString());

      setMessage(
        "¡Tus 10 pronósticos fueron confirmados correctamente! Ya no pueden modificarse.",
      );

      try {
        await onSubmitted();
      } catch {
        // El envío ya fue exitoso. No permitir repetirlo
        // aunque falle la actualización visual.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible confirmar los pronósticos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="py-24">
      <Container>
        <h2 className="mb-10 text-center text-4xl font-black sm:text-5xl">
          Próximos Partidos
        </h2>

        <PredictionProgress
          tournamentId={tournamentId}
          predictionsSubmittedAt={submittedAt}
        />

        {loading && (
          <div className="py-12 text-center text-slate-400">
            Cargando partidos...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mx-auto mb-8 max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center text-red-300"
          >
            {error}
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            No hay partidos disponibles.
          </div>
        )}

        {!loading && matches.length > 0 && (
          <>
            <div className="mb-10 rounded-2xl border border-white/10 bg-slate-900 p-6">
              <p className="text-lg font-bold text-white">
                {isConfirmed
                  ? "Pronósticos confirmados"
                  : "Selecciona los resultados de los 10 partidos"}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {isConfirmed
                  ? "Tus selecciones son definitivas y no pueden modificarse."
                  : `${selectedCount} de ${matches.length} pronósticos seleccionados.`}
              </p>

              {predictionsCloseAt && (
                <p className="mt-3 text-sm text-amber-300">
                  Fecha límite:{" "}
                  {new Date(predictionsCloseAt).toLocaleString(
                    "es-CO",
                    {
                      timeZone: "America/Bogota",
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}{" "}
                  (Colombia)
                </p>
              )}

              {!canPredict && !isConfirmed && (
                <p className="mt-3 text-sm text-yellow-400">
                  Para pronosticar debes estar inscrito y
                  tener el pago aprobado.
                </p>
              )}

              {deadlinePassed && !isConfirmed && (
                <p className="mt-3 text-sm text-red-400">
                  El plazo para confirmar pronósticos terminó.
                </p>
              )}
            </div>

            {Object.entries(grouped).map(([week, list]) => (
              <MatchWeek
                key={week}
                week={week}
                matches={list}
                tournamentId={tournamentId}
                selections={selections}
                onSelectionChange={handleSelectionChange}
                canPredict={canEdit}
              />
            ))}

            {!isConfirmed && canPredict && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
                <p className="mb-3 text-lg font-black">
                  {selectedCount} / 10 pronósticos
                </p>

                <p className="mb-6 text-sm text-slate-400">
                  Una vez confirmados, los resultados elegidos
                  no podrán cambiarse.
                </p>

                <button
                  type="button"
                  disabled={!readyToSubmit}
                  onClick={() => setConfirming(true)}
                  className="rounded-xl bg-red-600 px-8 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Confirmar mis 10 pronósticos
                </button>
              </div>
            )}

            {isConfirmed && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
                <p className="font-bold text-emerald-400">
                  ✓ Tus pronósticos están confirmados.
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  No es posible realizar modificaciones.
                </p>
              </div>
            )}

            {message && (
              <p
                role="status"
                className="mt-5 text-center text-emerald-400"
              >
                {message}
              </p>
            )}

            {confirming && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Confirmación definitiva"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              >
                <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-7">
                  <h3 className="text-2xl font-black text-white">
                    ¿Confirmar los 10 pronósticos?
                  </h3>

                  <p className="mt-4 text-slate-300">
                    Esta acción es definitiva. Una vez
                    confirmados, no podrás modificar ninguno
                    de tus resultados.
                  </p>

                  <div className="mt-7 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirming(false)}
                      className="rounded-xl border border-slate-600 px-5 py-3 font-bold"
                    >
                      Revisar nuevamente
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleSubmit()}
                      className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {submitting
                        ? "Confirmando..."
                        : "Sí, confirmar definitivamente"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  );
}
