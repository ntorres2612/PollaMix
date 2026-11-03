"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import {
  getCurrentTournament,
  getPrizeHistory,
  getTournamentPrizes,
  type PublicPrizeHistory,
  type PublicPrizesResponse,
} from "@/lib/tournaments";

type PrizeItem = {
  label: string;
  amount: number;
};

function pesos(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PremiosPage() {
  const [history, setHistory] = useState<PublicPrizeHistory[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [prizes, setPrizes] = useState<PublicPrizesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [current, previous] = await Promise.all([
          getCurrentTournament(),
          getPrizeHistory(),
        ]);

        if (!active) return;

        setHistory(previous);
        setCurrentId(current?.id ?? null);
        setSelectedId(current?.id ?? previous[0]?.id ?? null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Error al consultar las Pollas.");
          setLoading(false);
        }
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    setPrizes(null);

    getTournamentPrizes(selectedId)
      .then((result) => {
        if (active) setPrizes(result);
      })
      .catch((err) => {
        if (active) setError(
          err instanceof Error ? err.message : "Error al consultar premios.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [selectedId]);

  const awards: PrizeItem[] = prizes?.prizes
    ? [
        { label: "🥇 Primer lugar", amount: prizes.prizes.first },
        { label: "🥈 Segundo lugar", amount: prizes.prizes.second },
        { label: "🥉 Tercer lugar", amount: prizes.prizes.third },
      ]
    : [];

  const selectedHistory = history.find((item) => item.id === selectedId);

  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <Header />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400">
          PollaMix
        </p>

        <h1 className="mt-2 text-4xl font-black">Premios</h1>

        <p className="mt-3 text-slate-400">
          Consulta los premios de primero, segundo y tercer lugar.
        </p>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <label htmlFor="prize-tournament" className="block font-semibold">
            Selecciona una Polla
          </label>

          <select
            id="prize-tournament"
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(Number(event.target.value))}
            className="mt-3 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white"
          >
            {currentId !== null && (
              <option value={currentId}>Polla actual</option>
            )}

            {history
              .filter((item) => item.id !== currentId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.season}
                </option>
              ))}
          </select>

          {selectedHistory && (
            <p className="mt-3 text-sm text-slate-400">
              {selectedHistory.name} · Temporada {selectedHistory.season}
            </p>
          )}
        </section>

        {loading && <p className="mt-8 text-slate-400">Cargando premios...</p>}

        {!loading && error && (
          <p role="alert" className="mt-8 rounded-xl bg-red-950/40 p-4 text-red-200">
            {error}
          </p>
        )}

        {!loading && !error && selectedId === null && (
          <p className="mt-8 text-slate-400">
            No hay Pollas disponibles para consultar.
          </p>
        )}

        {!loading && !error && prizes && (
          <section className="mt-8">
            <p className={`font-bold ${
              prizes.finalized ? "text-emerald-300" : "text-amber-300"
            }`}>
              {prizes.finalized
                ? "Premios definitivos oficiales"
                : "Premios provisionales"}
            </p>

            {prizes.finalized && prizes.closedAt && (
              <p className="mt-2 text-sm text-slate-400">
                Cierre registrado:{" "}
                {new Date(prizes.closedAt).toLocaleString("es-CO")}
              </p>
            )}

            {awards.length ? (
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {awards.map((award) => (
                  <article
                    key={award.label}
                    className="rounded-2xl border border-white/10 bg-slate-900 p-6"
                  >
                    <p className="text-slate-300">{award.label}</p>
                    <p className="mt-3 text-3xl font-black">
                      {pesos(award.amount)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-white/5 p-5 text-slate-300">
                {prizes.message ?? "Los premios aún no están disponibles."}
              </p>
            )}
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
