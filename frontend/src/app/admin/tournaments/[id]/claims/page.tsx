"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  getCurrentUser,
  isAuthenticated,
} from "@/lib/auth";

import {
  getTournamentClaims,
  decideTournamentClaim,
  type TournamentClaimsResponse,
  type TournamentClaim,
} from "@/lib/claims";

import AdminClaimCorrection from "@/components/claims/AdminClaimCorrection";
import AdminClaimNoCorrectionResolution from "@/components/claims/AdminClaimNoCorrectionResolution";

const statusLabels = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

function ClaimStatus({
  claim,
}: {
  claim: TournamentClaim;
}) {
  const resolved =
    claim.status === "ACCEPTED"
      ? claim.resolvedAt !== null
      : claim.status === "REJECTED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-200">
        {statusLabels[claim.status]}
      </span>

      {claim.status === "ACCEPTED" && (
        <span className="text-xs text-amber-300">
          {resolved
            ? "Resuelta"
            : "Resolución pendiente"}
        </span>
      )}
    </div>
  );
}

export default function AdminTournamentClaimsPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = Number(params.id);

  const [data, setData] =
    useState<TournamentClaimsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [decisionStatus, setDecisionStatus] =
    useState<"ACCEPTED" | "REJECTED" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadClaims = useCallback(async () => {
    if (
      !Number.isSafeInteger(tournamentId) ||
      tournamentId <= 0
    ) {
      setError("Identificador de torneo inválido.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await getTournamentClaims(tournamentId);

      setData(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consultar las reclamaciones.",
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const refreshClaimsAfterMutation = useCallback(async () => {
    try {
      const response =
        await getTournamentClaims(tournamentId);

      setData(response);
    } catch {
      setError(
        "La operación anterior fue registrada correctamente, " +
        "pero no fue posible actualizar la lista. " +
        "Utiliza «Actualizar reclamaciones» para consultar " +
        "el estado más reciente. No repitas la operación.",
      );
    }
  }, [tournamentId]);

  function prepareDecision(
    claimId: number,
    status: "ACCEPTED" | "REJECTED",
  ) {
    if (saving) return;

    setSelectedClaimId(claimId);
    setDecisionStatus(status);
    setDecisionReason("");
    setConfirmed(false);
    setError("");
    setSuccess("");
  }

  async function handleDecideClaim(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving || selectedClaimId === null || !decisionStatus) {
      return;
    }

    if (!confirmed) {
      setError("Debes confirmar la decisión administrativa.");
      return;
    }

    const reason = decisionReason.trim();

    if (reason.length < 20 || reason.length > 2000) {
      setError("La justificación debe tener entre 20 y 2000 caracteres.");
      return;
    }

    const claim = data?.claims.find(
      (item) => item.id === selectedClaimId,
    );

    if (!claim || claim.status !== "PENDING") {
      setError("La reclamación ya no está pendiente.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await decideTournamentClaim(
        tournamentId,
        selectedClaimId,
        decisionStatus,
        reason,
      );

      setSelectedClaimId(null);
      setDecisionStatus(null);
      setDecisionReason("");
      setConfirmed(false);

      setSuccess(
        decisionStatus === "ACCEPTED"
          ? "Reclamación aceptada. Debes resolverla mediante corrección oficial o resolución sin modificar marcador."
          : "Reclamación rechazada y resuelta.",
      );

      await refreshClaimsAfterMutation();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la decisión.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const user = getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    void loadClaims();
  }, [router, loadClaims]);

  return (
    <main className="min-h-screen bg-[#071321] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/admin/tournaments/${tournamentId}`}
          className="text-sm font-semibold text-slate-400 hover:text-white"
        >
          ← Volver al torneo
        </Link>

        <p className="mt-8 text-sm font-bold uppercase tracking-widest text-red-400">
          Administración · PollaMix
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Reclamaciones
        </h1>

        <p className="mt-3 text-slate-400">
          Consulta administrativa de reclamaciones.
          Puedes aceptar, rechazar y resolver reclamaciones
          mediante una corrección oficial o una resolución
          administrativa sin cambio de marcador.
        </p>

        <button
          type="button"
          onClick={() => void loadClaims()}
          disabled={loading}
          className="mt-6 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Consultando..." : "Actualizar reclamaciones"}
        </button>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-200"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200"
          >
            {success}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-slate-400">
            Cargando reclamaciones...
          </p>
        ) : data ? (
          <div className="mt-8 space-y-5">
            <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <h2 className="text-xl font-bold">
                {data.tournament.name}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Total de reclamaciones: {data.total}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Resultados:{" "}
                {data.tournament.resultsPublishedAt
                  ? "publicados"
                  : "todavía no publicados"}
              </p>
            </section>

            {data.claims.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
                No hay reclamaciones registradas para esta Polla.
              </p>
            ) : (
              data.claims.map((claim) => (
                <article
                  key={claim.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">
                      Reclamación #{claim.id}
                    </h3>

                    <ClaimStatus claim={claim} />
                  </div>

                  <p className="mt-3 text-sm text-slate-400">
                    {claim.user?.name ?? "Participante"}
                    {" · "}
                    {claim.user?.email ?? "Sin correo disponible"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Creada:{" "}
                    {new Date(claim.createdAt).toLocaleString("es-CO")}
                  </p>

                  <p className="mt-4 whitespace-pre-wrap break-words text-slate-200">
                    {claim.reason}
                  </p>

                  {claim.status === "PENDING" && (
                    <div className="mt-5 border-t border-white/10 pt-5">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => prepareDecision(claim.id, "ACCEPTED")}
                          className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-bold text-emerald-300 disabled:opacity-50"
                        >
                          Aceptar reclamación
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => prepareDecision(claim.id, "REJECTED")}
                          className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 disabled:opacity-50"
                        >
                          Rechazar reclamación
                        </button>
                      </div>

                      {selectedClaimId === claim.id && decisionStatus && (
                        <form
                          onSubmit={handleDecideClaim}
                          className="mt-5 space-y-4 rounded-xl border border-white/10 bg-slate-950/70 p-4"
                        >
                          <p className="font-bold">
                            {decisionStatus === "ACCEPTED"
                              ? "Confirmar aceptación"
                              : "Confirmar rechazo"}
                          </p>

                          {decisionStatus === "ACCEPTED" && (
                            <p className="text-sm text-amber-300">
                              La aceptación no corrige automáticamente
                              los resultados. Será necesario aplicar
                              una corrección oficial posteriormente.
                            </p>
                          )}

                          <label
                            htmlFor={`decision-reason-${claim.id}`}
                            className="block text-sm font-semibold"
                          >
                            Justificación administrativa
                          </label>

                          <textarea
                            id={`decision-reason-${claim.id}`}
                            value={decisionReason}
                            onChange={(event) =>
                              setDecisionReason(event.target.value)
                            }
                            minLength={20}
                            maxLength={2000}
                            rows={4}
                            required
                            disabled={saving}
                            className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white"
                          />

                          <p className="text-xs text-slate-400">
                            {decisionReason.trim().length}/2000 caracteres
                            · mínimo 20
                          </p>

                          <label className="flex items-start gap-3 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              onChange={(event) =>
                                setConfirmed(event.target.checked)
                              }
                              disabled={saving}
                              className="mt-1"
                            />
                            Confirmo que revisé la reclamación y
                            autorizo registrar esta decisión.
                          </label>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="submit"
                              disabled={
                                saving ||
                                !confirmed ||
                                decisionReason.trim().length < 20 ||
                                decisionReason.trim().length > 2000
                              }
                              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {saving
                                ? "Guardando..."
                                : "Registrar decisión"}
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                setSelectedClaimId(null);
                                setDecisionStatus(null);
                                setError("");
                              }}
                              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {claim.status === "ACCEPTED" &&
                    claim.resolvedAt === null && (
                      <>
                        <AdminClaimCorrection
                          tournamentId={tournamentId}
                          claimId={claim.id}
                          onSuccess={refreshClaimsAfterMutation}
                        />
                        <AdminClaimNoCorrectionResolution
                          tournamentId={tournamentId}
                          claimId={claim.id}
                          onSuccess={refreshClaimsAfterMutation}
                        />
                      </>
                    )}

                  {claim.decision && (
                    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Decisión administrativa
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
                        {claim.decision}
                      </p>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
