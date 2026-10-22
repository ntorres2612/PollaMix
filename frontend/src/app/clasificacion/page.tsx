"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TournamentRanking from "@/components/tournaments/TournamentRanking";

import { getCurrentUser } from "@/lib/auth";
import {
  getCurrentPlayerTournament,
  getCurrentTournament,
} from "@/lib/tournaments";

interface Tournament {
  id: number;
  name: string;
  description?: string | null;
  season: number;
  leagueId: number;
}

export default function ClasificacionPage() {
  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] =
    useState<number | undefined>(undefined);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const user = getCurrentUser();

        setCurrentUserId(user?.id);

        const currentTournament = user
          ? await getCurrentPlayerTournament()
          : await getCurrentTournament();

        setTournament(
          currentTournament ?? null,
        );
      } catch (err) {
        console.error(
          "Error cargando clasificación:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar la clasificación.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <section className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
            Clasificación
          </p>

          <h1 className="mt-2 text-4xl font-black sm:text-5xl">
            Ranking de la Polla
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Consulta la posición y los puntos de los
            participantes del torneo actual.
          </p>
        </section>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center">
            <p className="text-slate-400">
              Cargando clasificación...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          !tournament && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center">
              <h2 className="text-xl font-bold text-white">
                No hay una Polla activa
              </h2>

              <p className="mt-2 text-slate-400">
                No existe un torneo disponible para
                mostrar la clasificación.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          tournament && (
            <section>
              <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <p className="text-sm uppercase tracking-wider text-slate-500">
                  Torneo actual
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {tournament.name}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Temporada {tournament.season}
                </p>
              </div>

              <TournamentRanking
                tournamentId={tournament.id}
                currentUserId={currentUserId}
              />
            </section>
          )}
      </div>

      <Footer />
    </main>
  );
}