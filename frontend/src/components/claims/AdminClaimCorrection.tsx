"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  applyTournamentClaimCorrection,
} from "@/lib/claims";

import {
  getSelectedTournamentMatches,
} from "@/lib/tournaments";

import type { ApiMatch } from "@/types/match";

interface Props {
  tournamentId: number;
  claimId: number;
  onSuccess: () => Promise<void>;
}

export default function AdminClaimCorrection({
  tournamentId,
  claimId,
  onSuccess,
}: Props) {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [matchId, setMatchId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);

  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      try {
        const response =
          await getSelectedTournamentMatches(tournamentId);

        if (active) {
          setMatches(response);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar los partidos.",
          );
        }
      } finally {
        if (active) {
          setLoadingMatches(false);
        }
      }
    }

    void loadMatches();

    return () => {
      active = false;
    };
  }, [tournamentId]);

  const selected = useMemo(
    () => matches.find((match) => match.id === Number(matchId)),
    [matches, matchId],
  );

  const currentScored =
    selected?.finished === true &&
    selected.scoredAt !== null &&
    Number.isSafeInteger(selected.homeScore) &&
    Number.isSafeInteger(selected.awayScore);

  const parsedHome = Number(homeScore);
  const parsedAway = Number(awayScore);

  const validScore =
    homeScore.trim() !== "" &&
    awayScore.trim() !== "" &&
    Number.isSafeInteger(parsedHome) &&
    Number.isSafeInteger(parsedAway) &&
    parsedHome >= 0 &&
    parsedAway >= 0;

  const differentScore =
    selected !== undefined &&
    (
      parsedHome !== selected.homeScore ||
      parsedAway !== selected.awayScore
    );

  const validReason =
    reason.trim().length >= 20 &&
    reason.trim().length <= 2000;

  const canSubmit =
    !sending &&
    !completed &&
    currentScored &&
    validScore &&
    differentScore &&
    validReason &&
    verified;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !selected) return;

    const confirmed = window.confirm(
      "ATENCIÓN: Esta operación modificará el marcador oficial " +
      "y recalculará los pronósticos asociados al partido. " +
      "Puede afectar otras Pollas. " +
      "¿Confirmas que verificaste el resultado oficial " +
      "de los 90 minutos y deseas aplicar esta corrección?",
    );

    if (!confirmed) return;

    setSending(true);
    setError("");
    setSuccess("");

    try {
      await applyTournamentClaimCorrection(
        tournamentId,
        claimId,
        {
          matchId: selected.id,
          homeScore: parsedHome,
          awayScore: parsedAway,
          reason: reason.trim(),
          officialResultVerified: true,
        },
      );

      setCompleted(true);
      setSuccess(
        "Corrección oficial aplicada. Los pronósticos " +
        "fueron recalculados por el backend.",
      );

      await onSuccess();
    } catch (err) {
      if (!completed) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible aplicar la corrección.",
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-amber-500/30 bg-amber-950/10 p-5">
      <h4 className="text-lg font-black text-white">
        Aplicar corrección oficial
      </h4>

      <p className="mt-2 text-sm text-amber-200">
        Esta operación modifica el marcador del partido
        y recalcula sus pronósticos. Un mismo partido puede
        pertenecer a varias Pollas.
      </p>

      {loadingMatches ? (
        <p className="mt-4 text-sm text-slate-400">
          Cargando partidos seleccionados...
        </p>
      ) : completed ? (
        <p role="status" className="mt-4 text-sm text-emerald-300">
          {success || "Corrección aplicada correctamente."}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor={`correction-match-${claimId}`}
              className="block text-sm font-bold"
            >
              Partido que se debe corregir
            </label>

            <select
              id={`correction-match-${claimId}`}
              value={matchId}
              disabled={sending}
              onChange={(event) => {
                setMatchId(event.target.value);
                setHomeScore("");
                setAwayScore("");
                setVerified(false);
                setError("");
              }}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white"
            >
              <option value="">Selecciona un partido</option>

              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.homeTeam.name} vs {match.awayTeam.name}
                  {" · ID "} {match.id}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="rounded-xl bg-slate-950/70 p-4 text-sm">
              <p className="font-semibold text-white">
                Marcador registrado
              </p>

              <p className="mt-2 text-slate-300">
                {selected.homeTeam.name}
                {" "}
                {selected.homeScore ?? "—"}
                {" - "}
                {selected.awayScore ?? "—"}
                {" "}
                {selected.awayTeam.name}
              </p>

              {!currentScored && (
                <p className="mt-2 text-amber-300">
                  Este partido no tiene un resultado final
                  puntuado y no puede corregirse todavía.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`correction-home-${claimId}`}
                className="block text-sm font-bold"
              >
                Goles local
              </label>

              <input
                id={`correction-home-${claimId}`}
                type="number"
                min={0}
                step={1}
                value={homeScore}
                disabled={sending || !currentScored}
                onChange={(event) =>
                  setHomeScore(event.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"
              />
            </div>

            <div>
              <label
                htmlFor={`correction-away-${claimId}`}
                className="block text-sm font-bold"
              >
                Goles visitante
              </label>

              <input
                id={`correction-away-${claimId}`}
                type="number"
                min={0}
                step={1}
                value={awayScore}
                disabled={sending || !currentScored}
                onChange={(event) =>
                  setAwayScore(event.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`correction-reason-${claimId}`}
              className="block text-sm font-bold"
            >
              Justificación de la corrección
            </label>

            <textarea
              id={`correction-reason-${claimId}`}
              value={reason}
              maxLength={2000}
              rows={4}
              disabled={sending}
              onChange={(event) =>
                setReason(event.target.value)
              }
              required
              placeholder="Explica la fuente oficial y el motivo de la corrección..."
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white"
            />

            <p className="mt-1 text-xs text-slate-400">
              {reason.trim().length}/2000 caracteres · mínimo 20
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={verified}
              disabled={sending}
              onChange={(event) =>
                setVerified(event.target.checked)
              }
              className="mt-1"
            />

            Confirmo que verifiqué el resultado oficial
            correspondiente a los 90 minutos del partido
            y que el marcador nuevo es correcto.
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending
              ? "Aplicando corrección..."
              : "Aplicar corrección oficial"}
          </button>
        </form>
      )}

      {!loadingMatches && matches.length === 0 && !completed && (
        <p className="mt-3 text-sm text-amber-300">
          No hay partidos seleccionados disponibles.
        </p>
      )}
    </section>
  );
}
