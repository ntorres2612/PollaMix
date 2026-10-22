'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Container from '@/components/ui/Container';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import {
  getTournaments,
  Tournament,
} from '@/lib/tournaments';

export default function AdminTournamentsPage() {
  const router = useRouter();

  const [tournaments, setTournaments] = useState<
    Tournament[]
  >([]);
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

    async function loadTournaments() {
      try {
        setLoading(true);
        setError('');

        const data = await getTournaments();

        setTournaments(data);
      } catch (error) {
        console.error(
          'Error cargando Pollas:',
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar las Pollas.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadTournaments();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 py-10 text-white">
        <Container>
          <div className="py-20 text-center text-slate-400">
            Cargando Pollas...
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 py-10 text-white">
      <Container>
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Administración
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Mis Pollas
            </h1>

            <p className="mt-3 text-slate-400">
              Administra torneos, participantes y partidos.
            </p>
          </div>

          {error && (
            <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
              {error}
            </div>
          )}

          {tournaments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <h2 className="text-xl font-bold">
                No hay Pollas registradas
              </h2>

              <p className="mt-2 text-slate-400">
                Todavía no existen torneos para administrar.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                        ID {tournament.id}
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {tournament.name}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${tournament.active
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                        }`}
                    >
                      {tournament.active
                        ? 'ACTIVA'
                        : 'INACTIVA'}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-950/60 p-4">
                      <p className="text-xs text-slate-500">
                        Temporada
                      </p>

                      <p className="mt-1 font-bold">
                        {tournament.season}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-950/60 p-4">
                      <p className="text-xs text-slate-500">
                        Premio
                      </p>

                      <p className="mt-1 font-bold">
                        $
                        {tournament.prize.toLocaleString(
                          'es-CO',
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/admin/tournaments/${tournament.id}`,
                      )
                    }
                    className="mt-6 w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-500"
                  >
                    Administrar partidos
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}