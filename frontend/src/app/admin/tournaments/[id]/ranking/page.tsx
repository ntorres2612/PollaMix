'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Container from '@/components/ui/Container';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import {
  getTournament,
  getTournamentRanking,
  TournamentDetail,
  TournamentRankingEntry,
} from '@/lib/tournaments';

export default function AdminTournamentRankingPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = Number(params.id);

  const [tournament, setTournament] =
    useState<TournamentDetail | null>(null);

  const [ranking, setRanking] =
    useState<TournamentRankingEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

    async function loadRanking() {
      try {
        setLoading(true);
        setError('');

        const [detail, rankingData] =
          await Promise.all([
            getTournament(tournamentId),
            getTournamentRanking(tournamentId),
          ]);

        setTournament(detail);
        setRanking(rankingData);
      } catch (error) {
        console.error(
          'Error cargando ranking:',
          error,
        );

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
  }, [router, tournamentId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 py-10 text-white">
        <Container>
          <div className="py-20 text-center text-slate-400">
            Cargando ranking...
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 py-10 text-white">
      <Container>
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/admin/tournaments/${tournamentId}`,
              )
            }
            className="mb-8 text-sm font-semibold text-slate-400 hover:text-white"
          >
            ← Volver a la Polla
          </button>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
              {error}
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                  Ranking
                </p>

                <h1 className="mt-2 text-4xl font-black">
                  {tournament?.name}
                </h1>
              </div>

              <div className="space-y-3">
                {ranking.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
                    Todavía no hay puntos registrados.
                  </div>
                ) : (
                  ranking.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xl font-black text-red-400">
                        {entry.position}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {entry.name}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black">
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
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
