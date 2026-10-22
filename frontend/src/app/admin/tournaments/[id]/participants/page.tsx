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
  getTournament,
  getTournamentPayments,
  updatePaymentStatus,
  TournamentDetail,
  TournamentPayment,
  PaymentStatus,
} from "@/lib/tournaments";

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

function getPaymentStatusLabel(
  participantPaid: boolean,
  payment?: TournamentPayment,
) {

  if (participantPaid) {
    return "PAGADO";
  }

  if (!payment) {
    return "SIN PAGO";
  }

  switch (
    payment.status
  ) {

    case "PENDING":
      return "PENDIENTE";

    case "APPROVED":
      return "PAGADO";

    case "REJECTED":
      return "RECHAZADO";

    case "CANCELLED":
      return "CANCELADO";

    default:
      return payment.status;
  }
}

function getPaymentStatusClasses(
  participantPaid: boolean,
  payment?: TournamentPayment,
) {

  if (
    participantPaid ||
    payment?.status ===
      "APPROVED"
  ) {

    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

  }

  if (
    payment?.status ===
    "REJECTED"
  ) {

    return "border-red-500/20 bg-red-500/10 text-red-400";

  }

  if (
    payment?.status ===
    "CANCELLED"
  ) {

    return "border-slate-500/20 bg-slate-500/10 text-slate-400";

  }

  if (
    payment?.status ===
    "PENDING"
  ) {

    return "border-amber-500/20 bg-amber-500/10 text-amber-400";

  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-400";
}

function getActionLabel(
  status?: PaymentStatus,
) {

  switch (status) {

    case "APPROVED":
      return "Aprobado";

    case "REJECTED":
      return "Rechazado";

    case "CANCELLED":
      return "Cancelado";

    default:
      return "Sin acción";
  }
}

export default function TournamentParticipantsPage() {

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
    payments,
    setPayments,
  ] =
    useState<TournamentPayment[]>(
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
    actionError,
    setActionError,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    processingPaymentId,
    setProcessingPaymentId,
  ] =
    useState<number | null>(
      null,
    );

  const loadData =
    useCallback(
      async (
        showLoading = false,
      ) => {

        try {

          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const [
            tournamentData,
            paymentsData,
          ] =
            await Promise.all([
              getTournament(
                tournamentId,
              ),

              getTournamentPayments(
                tournamentId,
              ),
            ]);

          setTournament(
            tournamentData,
          );

          setPayments(
            paymentsData,
          );

        } catch (err) {

          console.error(
            "Error cargando participantes y pagos:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar la información del torneo.",
          );

        } finally {

          if (showLoading) {
            setLoading(false);
          }

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
      router.push("/");
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

    loadData(true);

  }, [
    router,
    tournamentId,
    loadData,
  ]);

  const participants =
    tournament?.participants ??
    [];

  const paidCount =
    useMemo(
      () =>
        participants.filter(
          (
            participant,
          ) =>
            participant.paid,
        ).length,

      [
        participants,
      ],
    );

  const pendingCount =
    participants.length -
    paidCount;

  const isUnlimited =
    !tournament ||
    tournament.maxPlayers <=
      0;

  const availablePlaces =
    tournament &&
    !isUnlimited
      ? Math.max(
          tournament.maxPlayers -
            participants.length,
          0,
        )
      : null;

  const getParticipantPayment =
    useCallback(
      (
        participantId: number,
      ) => {

        return payments.find(
          (
            payment,
          ) =>
            payment.participantId ===
            participantId,
        );

      },
      [
        payments,
      ],
    );

  async function handlePaymentAction(
    paymentId: number,
    participantName: string,
    status: PaymentStatus,
  ) {

    const actionText =
      status ===
      "APPROVED"
        ? "aprobar"
        : status ===
          "REJECTED"
          ? "rechazar"
          : "cancelar";

    const confirmed =
      window.confirm(
        `¿Confirmas ${actionText} el pago de ${participantName}?`,
      );

    if (!confirmed) {
      return;
    }

    try {

      setProcessingPaymentId(
        paymentId,
      );

      setActionError("");
      setSuccessMessage("");

      await updatePaymentStatus(
        paymentId,
        status,
      );

      await loadData(
        false,
      );

      const message =
        status ===
        "APPROVED"
          ? `Pago de ${participantName} aprobado correctamente.`
          : status ===
            "REJECTED"
            ? `Pago de ${participantName} rechazado.`
            : `Pago de ${participantName} cancelado.`;

      setSuccessMessage(
        message,
      );

    } catch (err) {

      console.error(
        "Error actualizando pago:",
        err,
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el pago.",
      );

    } finally {

      setProcessingPaymentId(
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
              Cargando participantes...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#071321] px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-red-500/30 bg-red-950/30 p-8">

            <p className="text-sm font-bold uppercase tracking-wider text-red-400">
              Error
            </p>

            <h1 className="mt-2 text-2xl font-black text-white">
              No fue posible cargar los participantes
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
    return (
      <main className="min-h-screen bg-[#071321] px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center">

            <h1 className="text-2xl font-black">
              Torneo no encontrado
            </h1>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/tournaments",
                )
              }
              className="mt-6 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Volver a torneos
            </button>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071321] text-white">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Encabezado */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href={`/admin/tournaments/${tournament.id}`}
              className="text-sm font-semibold text-slate-400 transition hover:text-red-400"
            >
              ← Volver al torneo
            </Link>

            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-red-400">
              Administración
            </p>

            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Participantes
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
              href={`/admin/tournaments/${tournament.id}/ranking`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Ranking
            </Link>

          </div>

        </div>

        {/* Datos del torneo */}

        <section className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl">

          <div className="grid gap-6 md:grid-cols-4">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Torneo
              </p>

              <p className="mt-2 font-bold text-white">
                {tournament.name}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inscripción
              </p>

              <p className="mt-2 font-bold text-white">
                {formatCurrency(
                  tournament.inscription,
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Premio
              </p>

              <p className="mt-2 font-bold text-white">
                {formatCurrency(
                  tournament.prize,
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Estado
              </p>

              <p
                className={[
                  "mt-2 font-bold",
                  tournament.active
                    ? "text-emerald-400"
                    : "text-red-400",
                ].join(" ")}
              >
                {tournament.active
                  ? "Activo"
                  : "Inactivo"}
              </p>

            </div>

          </div>

        </section>

        {/* Estadísticas */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Participantes
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {participants.length}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {isUnlimited
                ? "de ilimitados"
                : `de ${tournament.maxPlayers}`}
            </p>

          </article>

          <article className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Pagados
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {paidCount}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              pagos aprobados
            </p>

          </article>

          <article className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Pendientes
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {pendingCount}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              requieren revisión
            </p>

          </article>

          <article className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Cupos disponibles
            </p>

            {isUnlimited ? (
              <>
                <p className="mt-2 text-4xl font-black text-white">
                  ∞
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  participantes sin límite
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-3xl font-black text-white">
                  {availablePlaces}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  lugares restantes
                </p>
              </>
            )}

          </article>

        </section>

        {/* Mensajes */}

        {(successMessage ||
          actionError) && (
          <section className="mb-6">

            {successMessage && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-5 py-4 text-sm font-semibold text-emerald-300">
                {successMessage}
              </div>
            )}

            {actionError && (
              <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-950/20 px-5 py-4 text-sm font-semibold text-red-300">
                {actionError}
              </div>
            )}

          </section>
        )}

        {/* Participantes */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl">

          <div className="border-b border-white/10 px-6 py-5">

            <h2 className="text-xl font-black text-white">
              Lista de participantes
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Jugadores inscritos y estado de sus pagos.
            </p>

          </div>

          {participants.length === 0 ? (

            <div className="p-10 text-center">

              <p className="text-slate-400">
                Todavía no hay participantes inscritos.
              </p>

            </div>

          ) : (

            <>
              {/* Desktop */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full">

                  <thead className="bg-slate-950/70">

                    <tr>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        #
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Jugador
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Correo
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Inscripción
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Referencia
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Estado
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Acción
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-white/5">

                    {participants.map(
                      (
                        participant,
                        index,
                      ) => {

                        const payment =
                          getParticipantPayment(
                            participant.id,
                          );

                        const canManage =
                          !participant.paid &&
                          payment?.status ===
                            "PENDING";

                        return (
                          <tr
                            key={
                              participant.id
                            }
                            className="transition hover:bg-white/[0.03]"
                          >

                            <td className="px-6 py-5">

                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-300">
                                {index + 1}
                              </div>

                            </td>

                            <td className="px-6 py-5">

                              <p className="font-bold text-white">
                                {
                                  participant
                                    .user
                                    .name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                ID usuario #
                                {
                                  participant
                                    .user
                                    .id
                                }
                              </p>

                            </td>

                            <td className="px-6 py-5 text-sm text-slate-300">
                              {
                                participant
                                  .user
                                  .email
                              }
                            </td>

                            <td className="px-6 py-5 text-sm font-semibold text-slate-300">
                              {formatCurrency(
                                tournament.inscription,
                              )}
                            </td>

                            <td className="px-6 py-5">

                              <p className="text-sm font-semibold text-slate-300">
                                {payment
                                  ?.reference ||
                                  "—"}
                              </p>

                              {payment?.method && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    payment.method
                                  }
                                </p>
                              )}

                            </td>

                            <td className="px-6 py-5">

                              <span
                                className={[
                                  "inline-flex rounded-full border px-3 py-1 text-xs font-bold",
                                  getPaymentStatusClasses(
                                    participant.paid,
                                    payment,
                                  ),
                                ].join(
                                  " ",
                                )}
                              >
                                {getPaymentStatusLabel(
                                  participant.paid,
                                  payment,
                                )}
                              </span>

                              {payment?.createdAt && (
                                <p className="mt-2 text-xs text-slate-600">
                                  {formatDate(
                                    payment.createdAt,
                                  )}
                                </p>
                              )}

                            </td>

                            <td className="px-6 py-5">

                              {canManage ? (

                                <div className="flex flex-wrap gap-2">

                                  <button
                                    type="button"
                                    disabled={
                                      processingPaymentId ===
                                      payment.id
                                    }
                                    onClick={() =>
                                      handlePaymentAction(
                                        payment.id,
                                        participant
                                          .user
                                          .name,
                                        "APPROVED",
                                      )
                                    }
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {processingPaymentId ===
                                    payment.id
                                      ? "..."
                                      : "Aprobar"}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      processingPaymentId ===
                                      payment.id
                                    }
                                    onClick={() =>
                                      handlePaymentAction(
                                        payment.id,
                                        participant
                                          .user
                                          .name,
                                        "REJECTED",
                                      )
                                    }
                                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Rechazar
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      processingPaymentId ===
                                      payment.id
                                    }
                                    onClick={() =>
                                      handlePaymentAction(
                                        payment.id,
                                        participant
                                          .user
                                          .name,
                                        "CANCELLED",
                                      )
                                    }
                                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>

                                </div>

                              ) : (

                                <span
                                  className={[
                                    "text-xs font-bold",
                                    payment?.status ===
                                      "APPROVED"
                                      ? "text-emerald-400"
                                      : payment?.status ===
                                          "REJECTED"
                                        ? "text-red-400"
                                        : "text-slate-500",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {getActionLabel(
                                    payment?.status,
                                  )}
                                </span>

                              )}

                            </td>

                          </tr>
                        );

                      },
                    )}

                  </tbody>

                </table>

              </div>

              {/* Mobile */}

              <div className="divide-y divide-white/5 md:hidden">

                {participants.map(
                  (
                    participant,
                    index,
                  ) => {

                    const payment =
                      getParticipantPayment(
                        participant.id,
                      );

                    const canManage =
                      !participant.paid &&
                      payment?.status ===
                        "PENDING";

                    return (
                      <article
                        key={
                          participant.id
                        }
                        className="p-5"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-300">
                              {index + 1}
                            </div>

                            <div>

                              <h3 className="font-bold text-white">
                                {
                                  participant
                                    .user
                                    .name
                                }
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                ID #
                                {
                                  participant
                                    .user
                                    .id
                                }
                              </p>

                            </div>

                          </div>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                              getPaymentStatusClasses(
                                participant.paid,
                                payment,
                              ),
                            ].join(
                              " ",
                            )}
                          >
                            {getPaymentStatusLabel(
                              participant.paid,
                              payment,
                            )}
                          </span>

                        </div>

                        <div className="mt-4 space-y-3 text-sm">

                          <div className="flex justify-between gap-4">

                            <span className="text-slate-500">
                              Correo
                            </span>

                            <span className="text-right text-slate-300">
                              {
                                participant
                                  .user
                                  .email
                              }
                            </span>

                          </div>

                          <div className="flex justify-between gap-4">

                            <span className="text-slate-500">
                              Inscripción
                            </span>

                            <span className="font-semibold text-slate-300">
                              {formatCurrency(
                                tournament.inscription,
                              )}
                            </span>

                          </div>

                          <div className="flex justify-between gap-4">

                            <span className="text-slate-500">
                              Referencia
                            </span>

                            <span className="text-right font-semibold text-slate-300">
                              {payment
                                ?.reference ||
                                "—"}
                            </span>

                          </div>

                          {payment?.method && (
                            <div className="flex justify-between gap-4">

                              <span className="text-slate-500">
                                Método
                              </span>

                              <span className="text-right text-slate-300">
                                {
                                  payment.method
                                }
                              </span>

                            </div>
                          )}

                        </div>

                        {canManage && (
                          <div className="mt-5 grid grid-cols-3 gap-2">

                            <button
                              type="button"
                              disabled={
                                processingPaymentId ===
                                payment.id
                              }
                              onClick={() =>
                                handlePaymentAction(
                                  payment.id,
                                  participant
                                    .user
                                    .name,
                                  "APPROVED",
                                )
                              }
                              className="rounded-xl bg-emerald-600 px-2 py-3 text-xs font-black uppercase text-white transition hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Aprobar
                            </button>

                            <button
                              type="button"
                              disabled={
                                processingPaymentId ===
                                payment.id
                              }
                              onClick={() =>
                                handlePaymentAction(
                                  payment.id,
                                  participant
                                    .user
                                    .name,
                                  "REJECTED",
                                )
                              }
                              className="rounded-xl bg-red-600 px-2 py-3 text-xs font-black uppercase text-white transition hover:bg-red-500 disabled:opacity-50"
                            >
                              Rechazar
                            </button>

                            <button
                              type="button"
                              disabled={
                                processingPaymentId ===
                                payment.id
                              }
                              onClick={() =>
                                handlePaymentAction(
                                  payment.id,
                                  participant
                                    .user
                                    .name,
                                  "CANCELLED",
                                )
                              }
                              className="rounded-xl bg-slate-700 px-2 py-3 text-xs font-black uppercase text-white transition hover:bg-slate-600 disabled:opacity-50"
                            >
                              Cancelar
                            </button>

                          </div>
                        )}

                      </article>
                    );
                  },
                )}

              </div>

            </>
          )}

        </section>

      </div>
    </main>
  );
}