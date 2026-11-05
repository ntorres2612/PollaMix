"use client";

import { useState, type FormEvent } from "react";
import { createTournamentClaim } from "@/lib/claims";

interface PlayerClaimFormProps {
  tournamentId: number;
}

export default function PlayerClaimForm({
  tournamentId,
}: PlayerClaimFormProps) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const length = reason.trim().length;
  const valid = length >= 20 && length <= 2000;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sending || submitted) return;

    if (!valid) {
      setError(
        "La descripción debe tener entre 20 y 2000 caracteres.",
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      await createTournamentClaim(tournamentId, reason);
      setSubmitted(true);
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la reclamación.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mb-8 rounded-3xl border border-amber-500/20 bg-slate-900/70 p-6 shadow-xl">
      <h2 className="text-2xl font-black text-white">
        Reclamaciones de resultados
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Si encuentras un error en un resultado, puntuación
        o clasificación, puedes presentar una reclamación
        justificada después de la publicación oficial.
      </p>

      <p className="mt-3 text-sm text-amber-300">
        El plazo es de 48 horas desde la publicación
        efectiva más reciente. El sistema verificará
        automáticamente si puedes reclamar.
      </p>

      {submitted ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200"
        >
          Tu reclamación fue registrada correctamente y
          quedó pendiente de revisión administrativa.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="claim-reason"
              className="mb-2 block text-sm font-bold text-white"
            >
              Descripción de la reclamación
            </label>

            <textarea
              id="claim-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
              rows={5}
              required
              disabled={sending}
              placeholder="Indica el partido, resultado o puntuación que consideras incorrecto y explica el motivo..."
              className="w-full rounded-xl border border-white/15 bg-slate-950 p-4 text-sm text-white outline-none transition focus:border-amber-400 disabled:opacity-60"
            />

            <p className="mt-2 text-right text-xs text-slate-400">
              {length}/2000 caracteres · mínimo 20
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!valid || sending}
            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending
              ? "Enviando reclamación..."
              : "Presentar reclamación"}
          </button>

          <p className="text-xs text-slate-400">
            Requiere inscripción, pago aprobado, resultados
            publicados y un plazo de reclamación vigente.
            No puedes tener otra reclamación pendiente
            en la misma Polla.
          </p>
        </form>
      )}
    </section>
  );
}
