'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Container from '@/components/ui/Container';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import {
  getUpcomingBoard,
  openTournament,
  UpcomingChampionship,
  UpcomingMatch,
} from '@/lib/tournaments';

function formatKickoff(value: string) {
  return new Date(value).toLocaleString('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [championships, setChampionships] = useState<UpcomingChampionship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [inscription, setInscription] = useState('10000');

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

    async function load() {
      try {
        setLoading(true);
        setError('');
        const board = await getUpcomingBoard();
        setChampionships(board.championships);
        if (board.championships[0]) {
          setSelectedKey(
            `${board.championships[0].leagueId}:${board.championships[0].season}`,
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar los partidos.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  const visibleChampionships = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return championships;
    return championships.filter((championship) =>
      `${championship.name} ${championship.country}`
        .toLowerCase()
        .includes(term),
    );
  }, [championships, query]);

  const selectedChampionship =
    championships.find(
      (championship) =>
        `${championship.leagueId}:${championship.season}` === selectedKey,
    ) ?? null;

  const matchesById = useMemo(() => {
    const map = new Map<number, UpcomingMatch & { championship: string; round: string }>();
    for (const championship of championships) {
      for (const round of championship.rounds) {
        for (const match of round.matches) {
          map.set(match.id, {
            ...match,
            championship: championship.name,
            round: round.roundName,
          });
        }
      }
    }
    return map;
  }, [championships]);

  function toggleMatch(matchId: number) {
    setSelectedIds((current) => {
      if (current.includes(matchId)) {
        return current.filter((id) => id !== matchId);
      }
      if (current.length >= 10) return current;
      return [...current, matchId];
    });
    setError('');
  }

  function useRound(matchIds: number[]) {
    setSelectedIds(matchIds.slice(0, 10));
    setError('');
    if (!name.trim() && selectedChampionship) {
      setName(`${selectedChampionship.name} · jornada`);
    }
  }

  async function save() {
    if (selectedIds.length !== 10) {
      setError('Selecciona exactamente 10 partidos.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const tournament = await openTournament({
        name: name.trim() || 'Polla GolPro',
        inscription: Number(inscription),
        currency: 'COP',
        matchIds: selectedIds,
      });
      router.push(`/admin/tournaments/${tournament.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No fue posible abrir la inscripción.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 py-10 text-white">
      <Container>
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.push('/admin/tournaments')}
            className="text-sm font-semibold text-slate-400 hover:text-white"
          >
            ← Mis Pollas
          </button>

          <div className="mt-4 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
                Administración
              </p>
              <h1 className="mt-2 text-4xl font-black">Armar Polla</h1>
              <p className="mt-3 max-w-2xl text-slate-400">
                Elige un campeonato, marca la jornada y deja 10 partidos.
                Con eso se abre la inscripción.
              </p>
            </div>
            <div
              className={`rounded-xl px-6 py-4 text-center ${
                selectedIds.length === 10
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              <p className="text-3xl font-black">
                {selectedIds.length}
                <span className="text-slate-500"> / 10</span>
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-16 text-center text-slate-400">
              Cargando campeonatos y jornadas...
            </p>
          ) : championships.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
              No hay partidos futuros para armar una Polla.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar campeonato"
                  className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-red-500"
                />
                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                  {visibleChampionships.map((championship) => {
                    const key = `${championship.leagueId}:${championship.season}`;
                    const active = key === selectedKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedKey(key)}
                        className={`w-full rounded-xl px-4 py-3 text-left ${
                          active ? 'bg-red-600' : 'bg-slate-950/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="block font-bold">{championship.name}</span>
                        <span className={`mt-1 block text-xs ${active ? 'text-red-100' : 'text-slate-400'}`}>
                          {championship.country} · {championship.upcoming} partidos
                        </span>
                      </button>
                    );
                  })}
                  {visibleChampionships.length === 0 && (
                    <p className="px-2 py-6 text-sm text-slate-400">
                      Ningún campeonato coincide con la búsqueda.
                    </p>
                  )}
                </div>
              </aside>

              <section className="space-y-5">
                {selectedChampionship?.rounds.map((round) => (
                  <article
                    key={round.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  >
                    <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-black">{round.roundName}</h2>
                        <p className="text-sm text-slate-400">
                          {round.matches.length}{' '}
                          {round.matches.length === 1 ? 'partido' : 'partidos'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => useRound(round.matches.map((match) => match.id))}
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10"
                      >
                        Usar esta jornada
                      </button>
                    </div>
                    <div className="divide-y divide-white/5">
                      {round.matches.map((match) => {
                        const selected = selectedIds.includes(match.id);
                        const disabled = !selected && selectedIds.length >= 10;
                        return (
                          <button
                            key={match.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleMatch(match.id)}
                            className={`flex w-full items-center gap-4 px-5 py-4 text-left ${
                              selected
                                ? 'bg-red-500/10'
                                : disabled
                                  ? 'cursor-not-allowed opacity-40'
                                  : 'hover:bg-white/[0.04]'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                                selected
                                  ? 'border-red-500 bg-red-500'
                                  : 'border-white/20 text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-bold">
                                {match.homeTeam} vs {match.awayTeam}
                              </span>
                              <span className="mt-1 block text-sm text-slate-400">
                                {formatKickoff(match.date)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}

                <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                  <h2 className="text-lg font-black">Abrir inscripción</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-slate-400">Nombre</span>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Polla de la jornada"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-slate-400">Inscripción COP</span>
                      <input
                        value={inscription}
                        onChange={(event) => setInscription(event.target.value)}
                        inputMode="numeric"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-red-500"
                      />
                    </label>
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    <p className="font-bold text-white">Premio según inscritos</p>
                    <p className="mt-1">
                      Se reparte el 67,81% de las inscripciones pagadas: 70% al primer lugar, 20% al segundo y 10% al tercero.
                    </p>
                  </div>
                  {selectedIds.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm text-slate-400">
                      {selectedIds.map((id) => {
                        const match = matchesById.get(id);
                        if (!match) return null;
                        return (
                          <li key={id}>
                            {match.championship}: {match.homeTeam} vs {match.awayTeam}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving || selectedIds.length !== 10}
                    className="mt-5 w-full rounded-xl bg-red-600 px-5 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? 'Abriendo inscripción...' : 'Abrir inscripción'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
