"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import { getCurrentUser } from "@/lib/auth";
import {
  getCurrentTournament,
  getMyPrizes,
  getPrizeHistory,
  getTournamentPrizes,
  getTournamentPrizesAdmin,
  markWinnerPaid,
  type MyPrizes,
  type PublicPrizeHistory,
  type PublicPrizesResponse,
  type TournamentPrizesResponse,
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
  const [myPrizes, setMyPrizes] = useState<MyPrizes | null>(null);
  const [adminPrizes, setAdminPrizes] = useState<TournamentPrizesResponse | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payingEntryId, setPayingEntryId] = useState<number | null>(null);
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

        if (getCurrentUser()?.role === "ADMIN") {
          setIsAdmin(true);
        }

        if (getCurrentUser()) {
          const mine = await getMyPrizes();
          if (active) setMyPrizes(mine);
        }
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

    if (getCurrentUser()?.role === "ADMIN") {
      getTournamentPrizesAdmin(selectedId)
        .then((result) => {
          if (active) setAdminPrizes(result);
        })
        .catch(() => {
          if (active) setAdminPrizes(null);
        });
    } else if (active) {
      setAdminPrizes(null);
    }

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

  async function payWinner(entryId: number) {
    if (!selectedId || payingEntryId !== null) return;
    setPayingEntryId(entryId);
    setError("");
    try {
      await markWinnerPaid(selectedId, entryId);
      const updated = await getTournamentPrizesAdmin(selectedId);
      setAdminPrizes(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el pago.");
    } finally {
      setPayingEntryId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <Header />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400">
          GolPro
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

        {isAdmin && adminPrizes?.winners && adminPrizes.winners.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-black">Ganadores y premio de cada uno</h2>
            <p className="mt-2 text-sm text-slate-400">
              Visible solo para el administrador. Al registrar el pago, el saldo de ese ganador queda en cero.
            </p>
            <ul className="mt-6 space-y-3">
              {adminPrizes.winners.map((winner, index) => (
                <li
                  key={`${winner.entryId ?? winner.userId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div>
                    <p className="font-bold">Puesto {winner.position}: {winner.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {winner.points} pts
                      {winner.paid ? " · Pagado" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-xl font-black ${winner.paid ? "text-slate-500 line-through" : ""}`}>
                        {pesos(winner.amountCOP)}
                      </p>
                      {winner.paid && (
                        <p className="text-sm font-bold text-emerald-300">Saldo en cero</p>
                      )}
                    </div>
                    {winner.entryId && !winner.paid && (
                      <button
                        type="button"
                        disabled={payingEntryId !== null}
                        onClick={() => void payWinner(winner.entryId as number)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        {payingEntryId === winner.entryId ? "Pagando..." : "Registrar pago"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {myPrizes && (
          <section id="mis-premios" className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {myPrizes.balanceKind === "profit"
                    ? "Ganancia después de repartir los premios"
                    : "Historial de premios ganados"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {myPrizes.balanceKind === "profit"
                    ? "Este saldo es lo que queda para el administrador una vez pagados los puestos."
                    : "Aquí solo aparecen tus premios. El saldo suma lo que te corresponde."}
                </p>
              </div>
              <p className="text-right">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Saldo</span>
                <span className="text-2xl font-black">{pesos(myPrizes.balanceCOP)}</span>
              </p>
            </div>

            {myPrizes.history.length === 0 ? (
              <p className="mt-6 rounded-xl bg-white/5 p-5 text-slate-300">
                {myPrizes.balanceKind === "profit"
                  ? "Todavía no hay una ganancia calculada."
                  : "Aún no tienes premios acreditados."}
              </p>
            ) : (
              <ul className="mt-6 space-y-3">
                {myPrizes.history.map((prize, index) => (
                  <li key={`${prize.tournamentId}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div>
                      <p className="font-bold">{prize.tournamentName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {prize.concept === "ganancia"
                          ? "Ganancia después de los premios"
                          : prize.paid
                            ? "Pagado · el saldo de este premio quedó en cero"
                            : `Puesto ${prize.position} · ${prize.points} pts`}
                        {prize.provisional || !prize.closedAt
                          ? " · Provisional"
                          : ` · ${new Date(prize.closedAt).toLocaleDateString("es-CO")}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${prize.paid ? "text-slate-500 line-through" : ""}`}>
                        {pesos(prize.amountCOP)}
                      </p>
                      {prize.paid && (
                        <p className="text-sm font-bold text-emerald-300">Saldo en cero</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
