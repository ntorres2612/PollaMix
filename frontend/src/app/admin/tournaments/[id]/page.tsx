'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Container from '@/components/ui/Container';
import RankingPages, {
  RANKING_PAGE_SIZE,
} from '@/components/ui/RankingPages';
import {
  getCurrentUser,
  isAuthenticated,
} from '@/lib/auth';

import {
  buildAdminSlips,
  getTournamentPayments,
  getTournamentPrizesAdmin,
  closeTournamentPrizes,
  type TournamentPrizesResponse,
  TournamentPayment,
  getTournament,
  getTournamentRanking,
  TournamentDetail,
  TournamentRankingEntry,
  updatePaymentStatus,
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

  const [slipPage, setSlipPage] = useState(1);
  const [rankingPage, setRankingPage] = useState(1);
  const [winnerPage, setWinnerPage] = useState(1);
  const [ranking, setRanking] =
    useState<TournamentRankingEntry[]>([]);

  const [payments, setPayments] =
    useState<TournamentPayment[]>([]);

  const [prizes, setPrizes] =
    useState<TournamentPrizesResponse | null>(null);

  const [prizesError, setPrizesError] = useState('');
  const [closingPrizes, setClosingPrizes] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [processingPayment, setProcessingPayment] = useState<{
    id: number;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);

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

        try {
          const prizeData = await getTournamentPrizesAdmin(tournamentId);
          setPrizes(prizeData);
          setPrizesError('');
        } catch (prizeError) {
          setPrizesError(
            prizeError instanceof Error
              ? prizeError.message
              : 'No fue posible consultar los premios.',
          );
        }
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

  const slips = useMemo(
    () =>
      tournament
        ? buildAdminSlips(tournament.participants, payments)
        : [],
    [tournament, payments],
  );

  const pendingSlips = slips.filter(
    (slip) => slip.payment?.status === 'PENDING',
  );
  const inscribed = useMemo(() => {
    if (!tournament) return [];

    return tournament.participants.map((participant) => ({
      participant,
      predictions: slips.filter(
        (slip) =>
          slip.participantId === participant.id &&
          slip.payment != null,
      ),
    }));
  }, [tournament, slips]);
  const slipPageCount = Math.max(
    1,
    Math.ceil(inscribed.length / RANKING_PAGE_SIZE),
  );
  const currentSlipPage = Math.min(slipPage, slipPageCount);
  const visibleInscribed = inscribed.slice(
    (currentSlipPage - 1) * RANKING_PAGE_SIZE,
    currentSlipPage * RANKING_PAGE_SIZE,
  );
  const rankingPageCount = Math.max(
    1,
    Math.ceil(ranking.length / RANKING_PAGE_SIZE),
  );
  const currentRankingPage = Math.min(rankingPage, rankingPageCount);
  const visibleRanking = ranking.slice(
    (currentRankingPage - 1) * RANKING_PAGE_SIZE,
    currentRankingPage * RANKING_PAGE_SIZE,
  );
  const winners = prizes?.winners ?? [];
  const winnerPageCount = Math.max(
    1,
    Math.ceil(winners.length / RANKING_PAGE_SIZE),
  );
  const currentWinnerPage = Math.min(winnerPage, winnerPageCount);
  const visibleWinners = winners.slice(
    (currentWinnerPage - 1) * RANKING_PAGE_SIZE,
    currentWinnerPage * RANKING_PAGE_SIZE,
  );

  function openWinnerPage(page: number) {
    setWinnerPage(page);
    document.getElementById('valor-ganadores')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  async function handlePaymentDecision(
    paymentId: number,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const payment = payments.find((item) => item.id === paymentId);

    if (!payment || payment.status !== 'PENDING') {
      setError('Este pronóstico no tiene un pago pendiente.');
      return;
    }

    if (status === 'REJECTED') {
      const confirmed = window.confirm(
        '¿Rechazas este pago porque no ingresó? El jugador podrá enviar otra solicitud.',
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setProcessingPayment({ id: paymentId, action: status });
      setError('');

      await updatePaymentStatus(paymentId, status);

      const [updated, updatedPayments, rankingData] =
        await Promise.all([
          getTournament(tournamentId),
          getTournamentPayments(tournamentId),
          getTournamentRanking(tournamentId),
        ]);

      setTournament(updated);
      setPayments(updatedPayments);
      setRanking(rankingData);
    } catch (error) {
      console.error(
        'Error actualizando pago:',
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : status === 'REJECTED'
            ? 'No fue posible rechazar el pago.'
            : 'No fue posible aprobar el pago.',
      );
    } finally {
      setProcessingPayment(null);
    }
  }

  async function handleClosePrizes() {
    if (!confirmClose || closingPrizes || prizes?.finalized) {
      return;
    }

    try {
      setClosingPrizes(true);
      setPrizesError('');

      await closeTournamentPrizes(tournamentId);

      const officialPrizes =
        await getTournamentPrizesAdmin(tournamentId);

      setPrizes(officialPrizes);
      setConfirmClose(false);
    } catch (closeError) {
      setPrizesError(
        closeError instanceof Error
          ? closeError.message
          : 'No fue posible completar el cierre.',
      );
    } finally {
      setClosingPrizes(false);
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
                  {`$${tournament.inscription.toLocaleString('es-CO')}`}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Premio
                </p>

                <p className="mt-2 text-2xl font-black">
                  {prizes?.finalized &&
                  typeof prizes.prizePoolCOP === 'number'
                    ? prizes.prizePoolCOP.toLocaleString('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        maximumFractionDigits: 0,
                      })
                    : 'Según inscritos'}
                </p>
                {!prizes?.finalized && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    67,81% de lo recaudado: 70% / 20% / 10%.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Participantes
                </p>

                <p className="mt-2 text-2xl font-black">
                  {tournament.participants.length}
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

          {/* PREMIOS DEFINITIVOS */}
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                  Premios
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Cierre definitivo de la Polla
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Consulta los premios y la distribución de ganadores.
                </p>
              </div>

              <span className={`rounded-full px-3 py-2 text-xs font-bold ${
                prizes?.finalized
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}>
                {prizes?.finalized
                  ? 'CIERRE DEFINITIVO'
                  : 'SIN CIERRE DEFINITIVO'}
              </span>
            </div>

            {prizesError && (
              <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {prizesError}
              </p>
            )}

            {prizes?.prizes && (
              <>
                {/* RESUMEN FINANCIERO ADMINISTRATIVO */}
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-white">
                    Resumen financiero
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Información exclusiva del administrador.
                    Valores obtenidos del registro financiero de la Polla.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: 'Total recaudado',
                        amount: prizes.revenueCOP,
                        money: true,
                      },
                      {
                        label: 'Bolsa total de premios',
                        amount: prizes.prizePoolCOP,
                        money: true,
                      },
                      {
                        label: 'Ganancia del administrador',
                        amount: prizes.profitCOP,
                        money: true,
                      },
                      {
                        label: 'Participantes pagados',
                        amount: prizes.registeredPaidPlayers,
                        money: false,
                      },
                    ].map(({ label, amount, money }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/5 bg-slate-950/60 p-5"
                      >
                        <p className="text-sm text-slate-400">
                          {label}
                        </p>
                        <p className="mt-2 text-2xl font-black text-white">
                          {typeof amount === 'number' && Number.isFinite(amount)
                            ? money
                              ? amount.toLocaleString('es-CO', {
                                  style: 'currency',
                                  currency: 'COP',
                                  maximumFractionDigits: 0,
                                })
                              : amount.toLocaleString('es-CO')
                            : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    ['Primer lugar', prizes.prizes.first],
                    ['Segundo lugar', prizes.prizes.second],
                    ['Tercer lugar', prizes.prizes.third],
                  ].map(([label, amount]) => (
                    <div key={String(label)} className="rounded-xl bg-slate-950/60 p-5">
                      <p className="text-sm text-slate-400">{label}</p>
                      <p className="mt-2 text-xl font-black">
                        {Number(amount).toLocaleString('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-sm text-slate-400">
                  Participantes pagados: {prizes.registeredPaidPlayers ?? 0}.
                  Bolsa: {Number(prizes.prizePoolCOP ?? 0).toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  })}.
                </p>

                {prizes?.finalized && (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div>
                      <h3 className="font-bold text-white">
                        Contacto de ganadores
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Consulta los datos de contacto de los premiados definitivos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/tournaments/${tournament.id}/ganadores`
                        )
                      }
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
                    >
                      Contactar ganadores
                    </button>
                  </div>
                )}

                {!!prizes.winners?.length && (
                  <div id="valor-ganadores" className="mt-6 space-y-2">
                    <h3 className="font-bold">
                      {prizes.finalized ? 'Ganadores oficiales' : 'Valor de cada ganador'}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Cada puesto reparte su premio entre quienes lo comparten. Esta lista solo se ve en administración.
                    </p>
                    <RankingPages
                      page={currentWinnerPage}
                      pageCount={winnerPageCount}
                      total={winners.length}
                      onPageChange={openWinnerPage}
                    />
                    {visibleWinners.map((winner, index) => (
                      <div key={`${winner.entryId ?? winner.userId}-${winner.position}-${index}`} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-950/60 p-4 text-sm">
                        <div>
                          <p>
                            Puesto {winner.position}: {winner.name}
                            {' '}({winner.points} puntos)
                          </p>
                          <p className="mt-1 text-slate-300">
                            Celular: {winner.phone ?? "Sin celular registrado"}
                          </p>
                          {winner.paid && (
                            <p className="mt-1 font-bold text-emerald-300">
                              Pago registrado{winner.paidAt
                                ? ` el ${new Date(winner.paidAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" })}`
                                : ""}
                            </p>
                          )}
                          {winner.phone && (
                            <a
                              href={`https://wa.me/${winner.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block font-bold text-red-400 hover:text-red-300"
                            >
                              Escribir por WhatsApp
                            </a>
                          )}
                        </div>
                        <strong>
                          {winner.amountCOP.toLocaleString('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            maximumFractionDigits: 0,
                          })}
                        </strong>
                      </div>
                    ))}
                    <RankingPages
                      page={currentWinnerPage}
                      pageCount={winnerPageCount}
                      total={winners.length}
                      onPageChange={openWinnerPage}
                    />
                  </div>
                )}
              </>
            )}

            {prizes?.finalized ? (
              <p className="mt-6 text-sm text-emerald-300">
                Resultados definitivos registrados
                {prizes.closedAt
                  ? ` el ${new Date(prizes.closedAt).toLocaleString('es-CO')}`
                  : ''}.
                No se pueden volver a cerrar los premios.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-amber-200">
                  Antes de cerrar, los partidos deben estar puntuados,
                  el torneo finalizado y todos los pagos conciliados.
                  El servidor mantiene la operación bloqueada hasta
                  completar la validación final.
                </p>

                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={confirmClose}
                    onChange={(event) => setConfirmClose(event.target.checked)}
                    className="mt-1"
                  />
                  Confirmo que revisé los resultados y pagos de esta Polla.
                  Entiendo que el cierre será definitivo.
                </label>

                <button
                  type="button"
                  disabled={!confirmClose || closingPrizes || !prizes}
                  onClick={handleClosePrizes}
                  className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {closingPrizes
                    ? 'Solicitando cierre...'
                    : 'Solicitar cierre definitivo'}
                </button>
              </div>
            )}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                {
                  title: 'Reclamaciones',
                  description: 'Consultar reclamaciones y decisiones administrativas',
                  path: 'claims',
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
                    Personas inscritas
                  </h2>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300">
                  {inscribed.length}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-400">
                Listado de quienes se inscribieron. Un pronóstico con pago rechazado deja de aparecer.
              </p>

              <div className="mt-6 space-y-3">
                <RankingPages
                  page={currentSlipPage}
                  pageCount={slipPageCount}
                  total={inscribed.length}
                  onPageChange={setSlipPage}
                />
                {inscribed.length === 0 ? (
                  <div className="rounded-xl bg-slate-950/50 p-6 text-center text-slate-400">
                    Todavía no hay personas inscritas.
                  </div>
                ) : (
                  visibleInscribed.map(({ participant, predictions }) => (
                      <div
                        key={participant.id}
                        className="rounded-2xl bg-slate-950/50 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {participant.user.name}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {participant.user.email}
                          </p>
                        </div>

                        {predictions.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-400">
                            Sin pronóstico activo
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {predictions.map((slip) => (
                              <div
                                key={slip.key}
                                className="flex flex-col gap-3 rounded-xl bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <p className="text-sm font-semibold text-slate-200">
                                  {predictions.length > 1
                                    ? `Pronóstico ${slip.slipNumber}`
                                    : 'Pronóstico'}
                                </p>
                                <div className="flex shrink-0 flex-wrap items-center gap-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                      slip.paid
                                        ? 'bg-green-500/15 text-green-400'
                                        : 'bg-yellow-500/15 text-yellow-400'
                                    }`}
                                  >
                                    {slip.paid
                                      ? 'PAGADO'
                                      : slip.payment?.status === 'PENDING'
                                        ? 'PENDIENTE'
                                        : 'SIN PAGO'}
                                  </span>

                                  {slip.payment?.status === 'PENDING' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePaymentDecision(
                                            slip.payment!.id,
                                            'APPROVED',
                                          )
                                        }
                                        disabled={
                                          processingPayment?.id === slip.payment.id
                                        }
                                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {processingPayment?.id === slip.payment.id &&
                                        processingPayment.action === 'APPROVED'
                                          ? 'Aprobando...'
                                          : 'Aprobar pago'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePaymentDecision(
                                            slip.payment!.id,
                                            'REJECTED',
                                          )
                                        }
                                        disabled={
                                          processingPayment?.id === slip.payment.id
                                        }
                                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {processingPayment?.id === slip.payment.id &&
                                        processingPayment.action === 'REJECTED'
                                          ? 'Rechazando...'
                                          : 'Rechazar'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )}
                <RankingPages
                  page={currentSlipPage}
                  pageCount={slipPageCount}
                  total={inscribed.length}
                  onPageChange={setSlipPage}
                />
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
                <RankingPages
                  page={currentRankingPage}
                  pageCount={rankingPageCount}
                  total={ranking.length}
                  onPageChange={setRankingPage}
                />
                {pendingSlips.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Pendientes de pago
                    </p>
                    {pendingSlips.map((slip) => (
                      <div
                        key={slip.key}
                        className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-white">
                            {slip.name}
                          </p>
                          <p className="text-sm text-amber-200">
                            Pronóstico pendiente
                          </p>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Sin puntos
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {ranking.length === 0 ? (
                  <div className="rounded-xl bg-slate-950/50 p-6 text-center text-slate-400">
                    Todavía no hay puntos registrados.
                  </div>
                ) : (
                  visibleRanking.map((entry) => (
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
                <RankingPages
                  page={currentRankingPage}
                  pageCount={rankingPageCount}
                  total={ranking.length}
                  onPageChange={setRankingPage}
                />
              </div>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
