'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Container from '@/components/ui/Container';
import {
  getCurrentUser,
  isAuthenticated,
} from '@/lib/auth';

import {
  approveParticipantPayment,
  getTournamentPayments,
  TournamentPayment,
  getTournament,
  getTournamentRanking,
  TournamentDetail,
  TournamentRankingEntry,
} from '@/lib/tournaments';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRegistrationStatus(
  tournament: TournamentDetail,
) {
  const now = new Date();

  const start = new Date(
    tournament.registrationStartsAt,
  );

  const end = new Date(
    tournament.registrationEndsAt,
  );

  if (now < start) {
    return {
      label: 'Inscripción pendiente',
      className:
        'bg-yellow-500/15 text-yellow-400',
    };
  }

  if (now > end) {
    return {
      label: 'Inscripción cerrada',
      className:
        'bg-slate-700 text-slate-300',
    };
  }

  return {
    label: 'Inscripción abierta',
    className:
      'bg-green-500/15 text-green-400',
  };
}

export default function AdminTournamentDetailPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = Number(params.id);

  const [tournament, setTournament] =
    useState<TournamentDetail | null>(null);

  const [ranking, setRanking] =
    useState<TournamentRankingEntry[]>([]);

  const [payments, setPayments] =
    useState<TournamentPayment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approvingPayment, setApprovingPayment] =
    useState<number | null>(null);

  useEffect(() => {
    const user = getCurrentUser();

    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    if (!user || user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    if (
      !Number.isInteger(tournamentId) ||
      tournamentId <= 0
    ) {
      setError('La Polla no es válida.');
      setLoading(false);
      return;
    }

    async function loadTournament() {
      try {
        setLoading(true);
        setError('');

        const [detail, rankingData, paymentsData] =
          await Promise.all([
            getTournament(tournamentId),
            getTournamentRanking(tournamentId),
            getTournamentPayments(tournamentId),
          ]);

        setTournament(detail);
        setRanking(rankingData);
        setPayments(paymentsData);
      } catch (error) {
        console.error(
          'Error cargando detalle de la Polla:',
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la Polla.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadTournament();
  }, [router, tournamentId]);

  const registrationStatus = useMemo(() => {
    if (!tournament) {
      return null;
    }

    return getRegistrationStatus(tournament);
  }, [tournament]);

  function getLatestParticipantPayment(
    participantId: number,
  ): TournamentPayment | undefined {
    return payments
      .filter((payment) => payment.participantId === participantId)
      .sort((a, b) => b.id - a.id)[0];
  }

  async function handleApprovePayment(
    participantId: number,
  ) {
    try {
      const payment = getLatestParticipantPayment(participantId);

      if (!payment || payment.status !== 'PENDING') {
        setError('Este participante no tiene un pago pendiente para aprobar.');
        return;
      }

      setApprovingPayment(participantId);
      setError('');

      await approveParticipantPayment(
        tournamentId,
        participantId,
      );

      const [updated, updatedPayments] =
        await Promise.all([
          getTournament(tournamentId),
          getTournamentPayments(tournamentId),
        ]);

      setTournament(updated);
      setPayments(updatedPayments);
    } catch (error) {
      console.error(
        'Error aprobando pago:',
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : 'No fue posible aprobar el pago.',
      );
    } finally {
      setApprovingPayment(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 py-10 text-white">
        <Container>
          <div className="py-20 text-center text-slate-400">
            Cargando Polla...
          </div>
        </Container>
      </main>
    );
  }

  if (error && !tournament) {
    return (
      <main className="min-h-screen bg-slate-950 py-10 text-white">
        <Container>
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
            <h1 className="text-2xl font-black text-red-400">
              No fue posible cargar la Polla
            </h1>

            <p className="mt-3 text-slate-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push('/admin/tournaments')
              }
              className="mt-6 rounded-xl bg-white/10 px-5 py-3 font-bold transition hover:bg-white/15"
            >
              Volver a mis Pollas
            </button>
          </div>
        </Container>
      </main>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 py-10 text-white">
      <Container>
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() =>
              router.push('/admin/tournaments')
            }
            className="mb-8 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            ← Volver a mis Pollas
          </button>

          {error && (
            <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
              {error}
            </div>
          )}

          {/* INFORMACIÓN DE LA POLLA */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
                    Polla #{tournament.id}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tournament.active
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tournament.active
                      ? 'ACTIVA'
                      : 'INACTIVA'}
                  </span>

                  {registrationStatus && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${registrationStatus.className}`}
                    >
                      {registrationStatus.label}
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-4xl font-black">
                  {tournament.name}
                </h1>

                {tournament.description && (
                  <p className="mt-3 max-w-3xl text-slate-400">
                    {tournament.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/tournaments/${tournament.id}/matches`,
                  )
                }
                className="rounded-xl bg-red-600 px-6 py-4 font-black text-white transition hover:bg-red-500"
              >
                Gestionar partidos
              </button>
            </div>

            {/* RESUMEN */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Temporada
                </p>

                <p className="mt-2 text-2xl font-black">
                  {tournament.season}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Inscripción
                </p>

                <p className="mt-2 text-2xl font-black">
                  {tournament.id === 7
                    ? 'US$5.00'
                    : `$${tournament.inscription.toLocaleString('es-CO')}`}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Premio
                </p>

                <p className="mt-2 text-2xl font-black">
                  {tournament.id === 7
                    ? `${tournament.prize.toLocaleString('es-CO')} (moneda por verificar)`
                    : `$${tournament.prize.toLocaleString('es-CO')}`}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Participantes
                </p>

                <p className="mt-2 text-2xl font-black">
                  {tournament.participants.length}

                  <span className="text-base text-slate-500">
                    {' '}
                    / {tournament.maxPlayers}
                  </span>
                </p>
              </div>
            </div>

            {/* FECHAS */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Período de inscripción
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {formatDate(
                    tournament.registrationStartsAt,
                  )}{' '}
                  —{' '}
                  {formatDate(
                    tournament.registrationEndsAt,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Duración de la Polla
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {formatDate(tournament.startsAt)} —{' '}
                  {formatDate(tournament.endsAt)}
                </p>
              </div>
            </div>
          </section>

          {/* CENTRO DE ADMINISTRACIÓN */}
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                Panel administrativo
              </p>
              <h2 className="mt-1 text-2xl font-black">Gestionar esta Polla</h2>
              <p className="mt-2 text-sm text-slate-400">
                Accede a los módulos de gestión del torneo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Participantes y pagos',
                  description: 'Jugadores, comprobantes y aprobación de pagos',
                  path: 'participants',
                },
                {
                  title: 'Partidos',
                  description: 'Seleccionar y administrar los partidos',
                  path: 'matches',
                },
                {
                  title: 'Puntuación',
                  description: 'Resultados, sincronización y cálculo de puntos',
                  path: 'scoring',
                },
                {
                  title: 'Clasificación',
                  description: 'Consultar el ranking completo',
                  path: 'ranking',
                },
              ].map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() =>
                    router.push(`/admin/tournaments/${tournament.id}/${item.path}`)
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-left transition hover:border-red-500/40 hover:bg-white/10"
                >
                  <h3 className="font-bold text-white">{item.title} →</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* PARTICIPANTES + RANKING */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* PARTICIPANTES */}
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                    Participantes
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Jugadores inscritos
                  </h2>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300">
                  {tournament.participants.length}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {tournament.participants.length ===
                0 ? (
                  <div className="rounded-xl bg-slate-950/50 p-6 text-center text-slate-400">
                    Todavía no hay participantes.
                  </div>
                ) : (
                  tournament.participants.map(
                    (participant) => (
                      <div
                        key={participant.id}
                        className="flex flex-col gap-4 rounded-2xl bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {participant.user.name}
                          </p>

                          <p className="truncate text-sm text-slate-500">
                            {participant.user.email}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              participant.paid
                                ? 'bg-green-500/15 text-green-400'
                                : getLatestParticipantPayment(participant.id)?.status === 'REJECTED'
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-yellow-500/15 text-yellow-400'
                            }`}
                          >
                            {participant.paid
                              ? 'PAGADO'
                              : getLatestParticipantPayment(participant.id)?.status === 'REJECTED'
                                ? 'RECHAZADO'
                                : getLatestParticipantPayment(participant.id)?.status === 'PENDING'
                                  ? 'PENDIENTE'
                                  : 'SIN PAGO'}
                          </span>

                          {!participant.paid &&
                            getLatestParticipantPayment(participant.id)?.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleApprovePayment(
                                  participant.id,
                                )
                              }
                              disabled={
                                approvingPayment ===
                                participant.id
                              }
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {approvingPayment ===
                              participant.id
                                ? 'Aprobando...'
                                : 'Aprobar pago'}
                            </button>
                          )}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>

            {/* RANKING */}
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                    Ranking
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Clasificación actual
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/tournaments/${tournament.id}/ranking`,
                    )
                  }
                  className="text-sm font-bold text-red-400 transition hover:text-red-300"
                >
                  Ver completo →
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {ranking.length === 0 ? (
                  <div className="rounded-xl bg-slate-950/50 p-6 text-center text-slate-400">
                    Todavía no hay puntos registrados.
                  </div>
                ) : (
                  ranking
                    .slice(0, 5)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 rounded-2xl bg-slate-950/50 p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 font-black text-red-400">
                          {entry.position}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-white">
                            {entry.name}
                          </p>

                          <p className="text-sm text-slate-500">
                            Posición{' '}
                            {entry.position}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black">
                            {entry.points}
                          </p>

                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            puntos
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
