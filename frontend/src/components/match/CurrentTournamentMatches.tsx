'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import MatchTable from '@/components/match/MatchTable';
import TournamentRanking from '@/components/tournaments/TournamentRanking';
import {
  getCurrentTournament,
  getTournamentMyStatus,
  joinTournament,
  type Tournament,
  type TournamentParticipationStatus,
} from '@/lib/tournaments';
import { getCurrentUser } from '@/lib/auth';

const PARTICIPATION_PRICE_USD = 5;

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    `${days}d`,
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(seconds).padStart(2, '0')}s`,
  ].join(' : ');
}

export default function CurrentTournamentMatches() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [status, setStatus] = useState<TournamentParticipationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const [currentUser, setCurrentUser] =
    useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTournament() {
      try {
        setLoading(true);
        setError('');
        const currentTournament = await getCurrentTournament();
        if (cancelled) return;
        setTournament(currentTournament);
        setStatus(null);

        if (currentTournament && currentUser) {
          const personalStatus = await getTournamentMyStatus(currentTournament.id);
          if (!cancelled) setStatus(personalStatus);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No fue posible cargar la Polla.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTournament();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  async function handleJoin() {
    if (!tournament || !currentUser || joining || status?.isParticipant) return;
    setJoining(true);
    setJoinError('');
    try {
      await joinTournament(tournament.id);
      const updatedStatus = await getTournamentMyStatus(tournament.id);
      setStatus(updatedStatus);
      if (!updatedStatus.isParticipant) {
        setJoinError('La inscripción se envió, pero no se pudo confirmar su estado. Recarga la página antes de intentarlo nuevamente.');
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'No se pudo registrar la inscripción.');
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return <section className="py-16 text-center text-slate-400">Cargando Polla actual...</section>;
  }

  if (error) {
    return (
      <section className="mx-auto my-10 max-w-5xl rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-red-300">
        {error}
      </section>
    );
  }

  if (!tournament) {
    return (
      <section className="mx-auto my-10 max-w-5xl rounded-2xl border border-white/10 bg-slate-900 p-8 text-center">
        <h2 className="text-xl font-bold">No hay una Polla disponible.</h2>
        <p className="mt-2 text-slate-400">Pronto anunciaremos una nueva competición.</p>
      </section>
    );
  }

  const registrationEnd = new Date(tournament.registrationEndsAt).getTime();
  const registrationStart = new Date(tournament.registrationStartsAt).getTime();
  const registrationOpen = now !== null && tournament.active && now >= registrationStart && now < registrationEnd;
  const registrationClosed = now !== null && now >= registrationEnd;
  const remaining = now === null ? null : Math.max(0, registrationEnd - now);
  const canPredict = Boolean(currentUser && status?.isParticipant && status?.paid);

  async function refreshParticipationStatus() {
    if (!tournament || !currentUser) return;

    const updatedStatus =
      await getTournamentMyStatus(tournament.id);

    setStatus(updatedStatus);
  }

  return (
    <div className="space-y-10 pb-20">
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl">
          <div className="border-b border-white/10 bg-gradient-to-r from-red-950/70 to-slate-900 px-6 py-8 sm:px-10">
            <p className="text-sm font-bold uppercase tracking-widest text-red-400">Pollas NT · TorresTech</p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">{tournament.name}</h2>
            <p className="mt-3 text-slate-300">Pronostica los resultados de Liga MX y compite por los premios.</p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-10">
            <div className="rounded-2xl bg-slate-800/80 p-5">
              <p className="text-sm text-slate-400">Valor por participación</p>
              <p className="mt-2 text-2xl font-black text-white">{formatUSD(PARTICIPATION_PRICE_USD)}</p>
            </div>
            <div className="rounded-2xl bg-slate-800/80 p-5">
              <p className="text-sm text-slate-400">Participantes inscritos</p>
              <p className="mt-2 text-2xl font-black text-white">{status?.participantsCount ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Cupos máximos: {tournament.maxPlayers}</p>
            </div>
            <div className="rounded-2xl bg-slate-800/80 p-5">
              <p className="text-sm text-slate-400">Estado de inscripciones</p>
              <p className="mt-2 text-lg font-black text-white">
                {registrationOpen ? 'Abiertas' : registrationClosed ? 'Cerradas' : 'Próximamente'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Cierre: {formatDate(tournament.registrationEndsAt)}</p>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-7 sm:px-10">
            <p className="text-sm font-semibold text-slate-300">Tiempo restante para participar</p>
            <p className="mt-3 font-mono text-2xl font-black tracking-wider text-white">
              {remaining === null ? 'Calculando...' : formatCountdown(remaining)}
            </p>

            <div className="mt-6">
              {!currentUser && registrationOpen && (
                <Link href="/login" className="inline-block rounded-xl bg-red-600 px-8 py-4 font-black text-white transition hover:bg-red-500">
                  Participar · {formatUSD(PARTICIPATION_PRICE_USD)}
                </Link>
              )}

              {currentUser && canPredict && (
                <p className="font-semibold text-emerald-400">Pago aprobado · Participación habilitada</p>
              )}

              {currentUser && status?.isParticipant && !canPredict && (
                <p className="font-semibold text-yellow-400">Inscripción registrada · Pago pendiente</p>
              )}

              {currentUser && !status?.isParticipant && registrationOpen && (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joining}
                  className="rounded-xl bg-red-600 px-8 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {joining ? 'Registrando inscripción...' : `Participar · ${formatUSD(PARTICIPATION_PRICE_USD)}`}
                </button>
              )}

              {joinError && (
                <p role="alert" className="mt-3 text-sm text-red-300">{joinError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
          <h3 className="text-2xl font-black text-white">Premios</h3>
          <div className="mt-5 rounded-2xl bg-slate-800/70 p-6">
            <p className="font-semibold text-white">
              {registrationClosed ? 'Premios pendientes de publicación' : 'Premios por anunciar'}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {registrationClosed
                ? 'Estamos verificando los pagos confirmados para publicar los valores definitivos.'
                : 'Los valores se publicarán cuando finalice el período de inscripciones.'}
            </p>
          </div>
        </div>
      </section>

      {status?.predictionsCloseAt != null ? (
        <MatchTable
          tournamentId={tournament.id}
          canPredict={canPredict}
          predictionsCloseAt={status.predictionsCloseAt}
          predictionsSubmittedAt={status.predictionsSubmittedAt}
          onSubmitted={refreshParticipationStatus}
        />
      ) : (
        <section className="mx-auto max-w-6xl px-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="mb-4 text-slate-300">Esta Polla utiliza el sistema histórico de marcadores.</p>
            <Link href="/pronosticos" className="inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold text-white">
              Ver pronósticos de esta Polla
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4">
        <TournamentRanking tournamentId={tournament.id} currentUserId={currentUser?.id} />
      </section>
    </div>
  );
}
