'use client';

import { useEffect, useState } from 'react';

import {
  getTournamentRanking,
  TournamentRankingEntry,
} from '@/lib/tournaments';

interface TournamentRankingProps {
  tournamentId: number;
  currentUserId?: number;
}

export default function TournamentRanking({
  tournamentId,
  currentUserId,
}: TournamentRankingProps) {
  const [ranking, setRanking] = useState<TournamentRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRanking() {
      try {
        setLoading(true);
        setError('');

        const data = await getTournamentRanking(tournamentId);

        setRanking(data);
      } catch (error) {
        console.error('Error cargando ranking:', error);

        setError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar el ranking.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadRanking();
  }, [tournamentId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <p className="text-center text-slate-400">
          Cargando ranking...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6">
        <p className="text-sm text-red-400">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
          Clasificación
        </p>

        <h2 className="mt-1 text-2xl font-black text-white">
          Ranking de la Polla
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl">
        <div className="grid grid-cols-[70px_1fr_100px] border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Pos.</span>
          <span>Jugador</span>
          <span className="text-right">Puntos</span>
        </div>

        <div className="divide-y divide-white/5">
          {ranking.map((player) => {
            const isCurrentUser =
              currentUserId === player.id;

            return (
              <div
                key={player.id}
                className={`grid grid-cols-[70px_1fr_100px] items-center px-4 py-4 transition ${
                  isCurrentUser
                    ? 'bg-red-500/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                      player.position === 1
                        ? 'bg-yellow-400/20 text-yellow-300'
                        : player.position === 2
                          ? 'bg-slate-300/20 text-slate-200'
                          : player.position === 3
                            ? 'bg-orange-400/20 text-orange-300'
                            : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {player.position}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {player.name}
                  </p>

                  {isCurrentUser && (
                    <span className="text-xs font-semibold text-red-400">
                      Tú
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-lg font-black text-white">
                    {player.points}
                  </span>

                  <span className="ml-1 text-xs text-slate-400">
                    pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}