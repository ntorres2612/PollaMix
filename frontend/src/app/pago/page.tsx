"use client";

import Link from "next/link";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import {
  createPayment,
  getCurrentPlayerTournament,
  getMyPayments,
  getTournamentMyStatus,
  joinTournament,
  Tournament,
  TournamentParticipationStatus,
  TournamentPayment,
} from "@/lib/tournaments";

import { getCurrentUser } from "@/lib/auth";

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
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

export default function PaymentPage() {

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
    status,
    setStatus,
  ] =
    useState<TournamentParticipationStatus | null>(
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
    joining,
    setJoining,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

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
            setStatus(null);
            setPayments([]);
            return;
          }

          const [
            tournamentStatus,
            myPayments,
          ] =
            await Promise.all([
              getTournamentMyStatus(
                currentTournament.id,
              ),

              getMyPayments(),
            ]);

          setStatus(
            tournamentStatus,
          );

          setPayments(
            myPayments.filter(
              (payment) =>
                payment.tournamentId ===
                currentTournament.id,
            ),
          );

        } catch (err) {

          console.error(
            "Error cargando información de pago:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar la información de la Polla.",
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

  const latestPayment =
    useMemo(
      () => {

        if (
          payments.length ===
          0
        ) {
          return null;
        }

        return [...payments]
          .sort(
            (
              a,
              b,
            ) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          )[0];

      },
      [payments],
    );

  const hasPendingPayment =
    latestPayment?.status ===
    "PENDING";

  const hasApprovedPayment =
    status?.paid ||
    latestPayment?.status ===
      "APPROVED";

  async function handleJoin() {

    if (!tournament) {
      return;
    }

    try {

      setJoining(true);
      setError("");
      setSuccess("");

      await joinTournament(
        tournament.id,
      );

      setSuccess(
        "Te has inscrito correctamente en la Polla.",
      );

      await loadData();

    } catch (err) {

      console.error(
        "Error inscribiendo usuario:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible realizar la inscripción.",
      );

    } finally {

      setJoining(false);

    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {

    event.preventDefault();

    if (!tournament) {
      return;
    }

    if (!status?.isParticipant) {
      setError(
        "Primero debes inscribirte en la Polla.",
      );
      return;
    }

    

    

    try {

      setSubmitting(true);
      setError("");
      setSuccess("");

      await createPayment({
        tournamentId: tournament.id,
      });

      setSuccess(
        "Solicitud de pago creada. Pendiente de verificación y aprobación por el administrador.",
      );

      await loadData();

    } catch (err) {

      console.error(
        "Error registrando pago:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar el pago.",
      );

    } finally {

      setSubmitting(false);

    }
  }

  if (loading) {

    return (
      <main className="min-h-screen bg-[#071321] text-white">

        <Header />

        <div className="mx-auto max-w-5xl px-4 py-20 text-center">

          <p className="text-slate-400">
            Cargando información de la Polla...
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
              Actualmente no encontramos una Polla disponible para tu cuenta.
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
            Inscripción y pago
          </h1>

          <p className="mt-2 text-slate-400">
            {tournament.name}
          </p>

        </div>

        {/* Información */}

        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl">

          <div className="grid gap-6 sm:grid-cols-3">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inscripción
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {formatCurrency(
                  tournament.inscription,
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Premio
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {formatCurrency(
                  tournament.prize,
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Estado
              </p>

              <p className="mt-2 font-bold text-emerald-400">
                {tournament.active
                  ? "ACTIVA"
                  : "INACTIVA"}
              </p>

            </div>

          </div>

        </section>

        {/* Mensajes */}

        {error && (

          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-950/20 px-5 py-4 text-sm font-semibold text-red-300">
            {error}
          </div>

        )}

        {success && (

          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-5 py-4 text-sm font-semibold text-emerald-300">
            {success}
          </div>

        )}

        {/* No inscrito */}

        {status &&
        !status.isParticipant ? (

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl">

            <div className="mx-auto max-w-2xl text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/15 text-3xl">
                ⚽
              </div>

              <h2 className="mt-5 text-2xl font-black">
                Aún no estás inscrito
              </h2>

              <p className="mt-3 text-slate-400">
                Inscríbete para participar en esta Polla y posteriormente registra tu pago.
              </p>

              {!status.registrationOpen ? (

                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 text-sm text-amber-300">
                  El período de inscripción actualmente está cerrado.
                </div>

              ) : (

                <button
                  type="button"
                  disabled={joining}
                  onClick={handleJoin}
                  className="mt-7 rounded-xl bg-red-600 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {joining
                    ? "Inscribiendo..."
                    : "Inscribirme en la Polla"}
                </button>

              )}

            </div>

          </section>

        ) : hasApprovedPayment ? (

          /* Pago aprobado */

          <section className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 p-8 shadow-2xl">

            <div className="mx-auto max-w-2xl text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-400">
                ✓
              </div>

              <h2 className="mt-5 text-2xl font-black text-white">
                Pago aprobado
              </h2>

              <p className="mt-3 text-slate-300">
                Tu inscripción está confirmada. Ya puedes participar en la Polla.
              </p>

              {latestPayment && (

                <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-black/10 p-5 text-left">

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-500">
                      Referencia
                    </span>

                    <span className="font-bold text-white">
                      {latestPayment.reference}
                    </span>

                  </div>

                  <div className="mt-3 flex justify-between gap-4">

                    <span className="text-slate-500">
                      Valor
                    </span>

                    <span className="font-bold text-white">
                      {formatCurrency(
                        latestPayment.amount,
                      )}
                    </span>

                  </div>

                  {latestPayment.paidAt && (

                    <div className="mt-3 flex justify-between gap-4">

                      <span className="text-slate-500">
                        Aprobado
                      </span>

                      <span className="text-right text-sm font-semibold text-emerald-400">
                        {formatDate(
                          latestPayment.paidAt,
                        )}
                      </span>

                    </div>

                  )}

                </div>

              )}

            </div>

          </section>

        ) : hasPendingPayment ? (

          /* Pago pendiente */

          <section className="rounded-3xl border border-amber-500/20 bg-amber-950/20 p-8 shadow-2xl">

            <div className="mx-auto max-w-2xl text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-3xl">
                ⏳
              </div>

              <h2 className="mt-5 text-2xl font-black">
                Pago pendiente de revisión
              </h2>

              <p className="mt-3 text-slate-300">
                Tu solicitud está pendiente de verificación. Todavía no se ha confirmado la recepción del dinero.
              </p>

              {latestPayment && (

                <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-black/10 p-5 text-left">

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-500">
                      Referencia
                    </span>

                    <span className="font-bold text-white">
                      {latestPayment.reference}
                    </span>

                  </div>

                  <div className="mt-3 flex justify-between gap-4">

                    <span className="text-slate-500">
                      Valor
                    </span>

                    <span className="font-bold text-white">
                      {formatCurrency(
                        latestPayment.amount,
                      )}
                    </span>

                  </div>

                  {latestPayment.method && (

                    <div className="mt-3 flex justify-between gap-4">

                      <span className="text-slate-500">
                        Método
                      </span>

                      <span className="font-semibold text-white">
                        {latestPayment.method}
                      </span>

                    </div>

                  )}

                </div>

              )}

            </div>

          </section>

        ) : (

          /* Solicitud de pago */

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl sm:p-8">

            <div className="max-w-2xl">

              <p className="text-sm font-bold uppercase tracking-wider text-red-400">
                Solicitud de pago
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Crea tu solicitud de pago
              </h2>

              <p className="mt-2 text-slate-400">
                Genera una solicitud por el valor de inscripción. El administrador deberá verificar el pago antes de aprobar tu participación.
              </p>

              {latestPayment?.status === "REJECTED" && (

                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-sm text-red-200"
                >

                  <p className="font-bold text-red-300">
                    Tu solicitud anterior fue rechazada
                  </p>

                  <p className="mt-2">
                    El administrador no aprobó tu solicitud anterior.
                    Si consideras que existe un error, contacta al administrador.
                    Puedes crear una nueva solicitud mientras las
                    inscripciones continúen abiertas.
                  </p>

                </div>

              )}

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-8 space-y-6"
              >

                <div>

                  <label className="text-sm font-bold text-slate-300">
                    Valor de inscripción
                  </label>

                  <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-lg font-black text-white">
                    {formatCurrency(
                      tournament.inscription,
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    El valor está definido por la Polla y no puede ser modificado.
                  </p>

                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5 text-sm text-blue-200">

                  <p className="font-bold">
                    Importante
                  </p>

                  <p className="mt-2 text-blue-200/80">
                    Esta acción no realiza un cobro ni confirma una transferencia. La solicitud quedará pendiente hasta que el administrador verifique y apruebe el pago.
                  </p>

                </div>

                <button
                  type="submit"
                  disabled={
                    submitting || !status?.registrationOpen
                  }
                  className="w-full rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Creando solicitud..."
                    : "Solicitud de pago"}
                </button>

              </form>

            </div>

          </section>

        )}

      </div>

      <Footer />

    </main>
  );
}