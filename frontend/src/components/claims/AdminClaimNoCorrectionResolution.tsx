"use client";

import { useState, type FormEvent } from "react";

import {
  resolveTournamentClaimWithoutCorrection,
} from "@/lib/claims";

interface Props {
  tournamentId: number;
  claimId: number;
  onSuccess: () => Promise<void>;
}

export default function AdminClaimNoCorrectionResolution({
  tournamentId,
  claimId,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const validReason =
    reason.trim().length >= 20 &&
    reason.trim().length <= 2000;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (sending || completed || !verified || !validReason) {
      return;
    }

    const confirmation = window.confirm(
      "¿Confirmas que revisaste la reclamación y el " +
      "resultado oficial, y que NO es necesario modificar " +
      "ningún marcador? Esta operación registrará " +
      "la reclamación como resuelta.",
    );

    if (!confirmation) return;

    setSending(true);
    setError("");

    try {
      await resolveTournamentClaimWithoutCorrection(
        tournamentId,
        claimId,
        reason.trim(),
        true,
      );

      setCompleted(true);

      try {
        await onSuccess();
      } catch {
        // La resolución ya se registró correctamente.
        // Un error al actualizar la lista no debe
        // presentarse como un fallo del registro.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la resolución. " +
            "Actualiza la lista antes de reintentar.",
      );
    } finally {
      setSending(false);
    }
  }

  if (completed) {
    return (
      <p
        role="status"
        className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-200"
      >
        Resolución sin corrección registrada.
        No se modificaron los marcadores.
      </p>
    );
  }

  return (
    <section className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-5">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={sending}
        aria-expanded={open}
        aria-controls={`no-correction-form-${claimId}`}
        className="rounded-xl border border-emerald-500/40 px-4 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50"
      >
        {open
          ? "Ocultar resolución sin corrección"
          : "Resolver sin modificar marcador"}
      </button>

      {open && (
        <form
          id={`no-correction-form-${claimId}`}
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <p className="text-sm text-slate-300">
            Utiliza esta opción únicamente cuando hayas
            verificado que la reclamación aceptada puede
            resolverse sin cambiar los resultados oficiales.
            La operación quedará registrada en la auditoría.
          </p>

          <div>
            <label
              htmlFor={`no-correction-reason-${claimId}`}
              className="block text-sm font-bold"
            >
              Justificación administrativa
            </label>

            <textarea
              id={`no-correction-reason-${claimId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={20}
              maxLength={2000}
              rows={4}
              required
              disabled={sending}
              placeholder="Explica por qué no es necesario modificar el marcador..."
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white"
            />

            <p className="mt-1 text-xs text-slate-400">
              {reason.trim().length}/2000 caracteres · mínimo 20
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) =>
                setVerified(event.target.checked)
              }
              disabled={sending}
              className="mt-1"
            />
            Confirmo que revisé la reclamación y verifiqué
            que el resultado oficial no requiere modificación.
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={sending || !verified || !validReason}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {sending
                ? "Registrando resolución..."
                : "Confirmar resolución sin corrección"}
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() => {
                setOpen(false);
                setVerified(false);
                setReason("");
                setError("");
              }}
              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
