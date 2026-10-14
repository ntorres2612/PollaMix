"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import { getCurrentUser } from "@/lib/auth";
import {
  getCurrentPlayerTournament,
  getCurrentTournament,
  getTournamentMyStatus,
} from "@/lib/tournaments";

interface Tournament {
  id: number;
  name: string;
  description?: string | null;
  season: number;
  leagueId: number;
}

interface TournamentStatus {
  tournamentId: number;
  active: boolean;
  registrationOpen: boolean;
  registrationStartsAt: string;
  registrationEndsAt: string;
  startsAt: string;
  endsAt: string;
  inscription: number;
  prize: number;
  maxPlayers: number;
  participantsCount: number;
  isParticipant: boolean;
  paid: boolean;
}

export default function JornadasPage() {
  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [status, setStatus] =
    useState<TournamentStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = getCurrentUser();

  const canPlay = Boolean(
    user &&
      status?.isParticipant &&
      status?.paid,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const currentUser = getCurrentUser();

        const currentTournament = currentUser
          ? await getCurrentPlayerTournament()
          : await getCurrentTournament();

        if (cancelled) return;

        if (!currentTournament) {
          setTournament(null);
          setStatus(null);
          return;
        }

        setTournament(currentTournament);

        if (currentUser) {
          const tournamentStatus =
            await getTournamentMyStatus(
              currentTournament.id,
            );

          if (!cancelled) {
            setStatus(tournamentStatus);
          }
        } else {
          setStatus(null);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Error cargando Jornadas:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar las jornadas.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <section className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
            PollaMix
          </p>

          <h1 className="mt-2 text-4xl font-black sm:text-5xl">
            Jornadas
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Consulta la Polla activa y accede al espacio
            de pronósticos para registrar tus marcadores.
          </p>
        </section>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center">
            <p className="text-slate-400">
              Cargando jornadas...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && !tournament && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center">
            <h2 className="text-xl font-bold text-white">
              No hay una Polla activa
            </h2>

            <p className="mt-2 text-slate-400">
              En este momento no existe un torneo disponible.
            </p>
          </div>
        )}

        {!loading && !error && tournament && (
          <section>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                    Polla actual
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    {tournament.name}
                  </h2>

                  {tournament.description && (
                    <p className="mt-3 max-w-2xl text-slate-400">
                      {tournament.description}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Temporada
                  </p>

                  <p className="mt-1 font-bold text-white">
                    {tournament.season}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                {!user && (
                  <>
                    <h3 className="text-lg font-bold">
                      Inicia sesión para participar
                    </h3>

                    <p className="mt-2 text-slate-400">
                      Accede a tu cuenta para consultar tu
                      participación y realizar pronósticos.
                    </p>

                    <Link
                      href="/login"
                      className="mt-5 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500"
                    >
                      Iniciar sesión
                    </Link>
                  </>
                )}

                {user && !status?.isParticipant && (
                  <>
                    <h3 className="text-lg font-bold">
                      Aún no estás inscrito en esta Polla
                    </h3>

                    <p className="mt-2 text-slate-400">
                      Debes completar la inscripción antes
                      de registrar tus pronósticos.
                    </p>
                  </>
                )}

                {user &&
                  status?.isParticipant &&
                  !status?.paid && (
                    <>
                      <h3 className="text-lg font-bold">
                        Tu pago está pendiente de aprobación
                      </h3>

                      <p className="mt-2 text-slate-400">
                        Podrás acceder a los pronósticos
                        cuando tu pago haya sido aprobado.
                      </p>

                      <Link
                        href="/pago"
                        className="mt-5 inline-flex rounded-xl border border-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/5"
                      >
                        Consultar pago
                      </Link>
                    </>
                  )}

                {canPlay && (
                  <>
                    <h3 className="text-lg font-bold">
                      Ya puedes realizar tus pronósticos
                    </h3>

                    <p className="mt-2 text-slate-400">
                      Consulta los partidos seleccionados
                      por el administrador, registra tus
                      marcadores y revisa tu progreso desde
                      un solo lugar.
                    </p>

                    <Link
                      href="/pronosticos"
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500"
                    >
                      Ir a mis pronósticos
                      <span aria-hidden="true">→</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}