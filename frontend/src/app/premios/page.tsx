"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
  inscription?: number;
  prize?: number;
  maxPlayers?: number;
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number") {
    return "$0";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PremiosPage() {
  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const user = getCurrentUser();

        const currentTournament = user
          ? await getCurrentPlayerTournament()
          : await getCurrentTournament();

        setTournament(
          currentTournament ?? null,
        );
      } catch (err) {
        console.error(
          "Error cargando premios:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar la información de premios.",
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
            Premios
          </p>

          <h1 className="mt-2 text-4xl font-black sm:text-5xl">
            Premio de la Polla
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Consulta la inscripción, el premio y las
            condiciones del torneo actual.
          </p>
        </section>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center">
            <p className="text-slate-400">
              Cargando información...
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
                En este momento no hay información de
                premios disponible.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          tournament && (
            <>
              <section className="mb-8 rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 p-8 shadow-2xl">
                <div className="mb-8">
                  <p className="text-sm font-bold uppercase tracking-wider text-red-400">
                    Torneo actual
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-white">
                    {tournament.name}
                  </h2>

                  <p className="mt-2 text-slate-400">
                    Temporada {tournament.season}
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                      Inscripción
                    </p>

                    <p className="mt-3 text-3xl font-black text-white">
                      {formatCurrency(
                        tournament.inscription,
                      )}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-red-500/20 bg-red-600/10 p-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-red-300">
                      Premio
                    </p>

                    <p className="mt-3 text-3xl font-black text-white">
                      {formatCurrency(
                        tournament.prize,
                      )}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                      Participantes máximos
                    </p>

                    <p className="mt-3 text-3xl font-black text-white">
                      {tournament.maxPlayers ?? 0}
                    </p>
                  </article>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-7">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 text-2xl">
                    🏆
                  </div>

                  <h3 className="text-xl font-black text-white">
                    Premio principal
                  </h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    El participante con mayor cantidad
                    de puntos al finalizar la Polla ocupa
                    la primera posición de la clasificación.
                  </p>
                </article>

                <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-7">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 text-2xl">
                    ⚽
                  </div>

                  <h3 className="text-xl font-black text-white">
                    Sistema de puntos
                  </h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    Cada pronóstico es evaluado frente al
                    resultado real del partido y los puntos
                    obtenidos se acumulan en la clasificación
                    del torneo.
                  </p>
                </article>
              </section>
            </>
          )}
      </div>

      <Footer />
    </main>
  );
}