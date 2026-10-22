'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Container from '@/components/ui/Container';
import TournamentMatchSelector from '@/components/admin/TournamentMatchSelector';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';

export default function TournamentMatchesAdminPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = Number(params.id);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    const user = getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [router]);

  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    return (
      <main className="min-h-screen bg-slate-950 py-10 text-white">
        <Container>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold">
              Torneo no válido
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              El identificador de la Polla no es válido.
            </p>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 py-10 text-white">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-wider text-red-400">
              Administración
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Administrar Polla
            </h1>

            <p className="mt-2 text-slate-400">
              Selecciona los 10 partidos que estarán disponibles
              para realizar pronósticos.
            </p>
          </div>

          <TournamentMatchSelector tournamentId={tournamentId} />
        </div>
      </Container>
    </main>
  );
}
