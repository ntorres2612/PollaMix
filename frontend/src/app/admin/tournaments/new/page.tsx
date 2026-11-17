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
import { countryNameEs, teamNameEs } from '@/lib/team-name';
import { leagueNameEs, roundNameEs } from '@/lib/league-name';

function teamText(match: UpcomingMatch) {
  return `${teamNameEs(match.homeTeam)} ${teamNameEs(match.awayTeam)} ${match.homeTeam} ${match.awayTeam}`.toLowerCase();
}

function championshipText(championship: UpcomingChampionship) {
  return `${leagueNameEs(championship.name, championship.country)} ${countryNameEs(championship.country)} ${championship.name} ${championship.country}`.toLowerCase();
}

function canSelect(match: UpcomingMatch) {
  if (typeof match.playable === 'boolean') return match.playable;
  return new Date(match.date).getTime() > Date.now();
}

function formatKickoff(value: string) {
  return new Date(value).toLocaleString('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 10;

function Pager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-xl border border-white/15 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-slate-400">
        Página {page} de {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="rounded-xl border border-white/15 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
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
  const [inscription, setInscription] = useState('16000');
  const [championshipPage, setChampionshipPage] = useState(1);
  const [matchPage, setMatchPage] = useState(1);

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
      championshipText(championship).includes(term) ||
      championship.rounds.some((round) =>
        round.matches.some((match) => teamText(match).includes(term)),
      ),
    );
  }, [championships, query]);

  useEffect(() => {
    if (!visibleChampionships.length) return;
    const visible = visibleChampionships.some(
      (championship) =>
        `${championship.leagueId}:${championship.season}` === selectedKey,
    );
    if (!visible) {
      const first = visibleChampionships[0];
      setSelectedKey(`${first.leagueId}:${first.season}`);
      setMatchPage(1);
    }
  }, [visibleChampionships, selectedKey]);

  const championshipPageCount = Math.max(
    1,
    Math.ceil(visibleChampionships.length / PAGE_SIZE),
  );
  const championshipPageSafe = Math.min(championshipPage, championshipPageCount);
  const pagedChampionships = visibleChampionships.slice(
    (championshipPageSafe - 1) * PAGE_SIZE,
    championshipPageSafe * PAGE_SIZE,
  );

  const selectedChampionship =
    visibleChampionships.find(
      (championship) =>
        `${championship.leagueId}:${championship.season}` === selectedKey,
    ) ??
    visibleChampionships[0] ??
    null;

  const listedMatches = useMemo(() => {
    if (!selectedChampionship) return [];
    const term = query.trim().toLowerCase();
    const leagueMatches = championshipText(selectedChampionship).includes(term);
    return selectedChampionship.rounds.flatMap((round) =>
      round.matches
        .filter((match) => !term || leagueMatches || teamText(match).includes(term))
        .map((match) => ({
          ...match,
          roundId: round.id,
          roundName: round.roundName,
          roundSize: round.matches.length,
        })),
    );
  }, [selectedChampionship, query]);

  const matchPageCount = Math.max(1, Math.ceil(listedMatches.length / PAGE_SIZE));
  const matchPageSafe = Math.min(matchPage, matchPageCount);
  const pagedMatches = listedMatches.slice(
    (matchPageSafe - 1) * PAGE_SIZE,
    matchPageSafe * PAGE_SIZE,
  );
  const pagedRounds = pagedMatches.reduce<
    Array<{
      id: number;
      roundName: string;
      roundSize: number;
      matches: typeof pagedMatches;
    }>
  >((groups, match) => {
    const current = groups[groups.length - 1];
    if (!current || current.roundName !== match.roundName) {
      groups.push({
        id: match.roundId,
        roundName: match.roundName,
        roundSize: match.roundSize,
        matches: [match],
      });
      return groups;
    }
    current.matches.push(match);
    return groups;
  }, []);

  const matchesById = useMemo(() => {
    const map = new Map<number, UpcomingMatch & { championship: string; round: string }>();
    for (const championship of championships) {
      for (const round of championship.rounds) {
        for (const match of round.matches) {
          map.set(match.id, {
            ...match,
            championship: leagueNameEs(championship.name, championship.country),
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
      return [...current, matchId];
    });
    setError('');
  }

  function useRound(matchIds: number[]) {
    setSelectedIds(matchIds);
    setError('');
    if (!name.trim() && selectedChampionship) {
      setName(`${leagueNameEs(selectedChampionship.name, selectedChampionship.country)} · jornada`);
    }
  }

  async function save() {
    if (selectedIds.length < 1) {
      setError('Selecciona al menos un partido.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const tournament = await openTournament({
        name: name.trim() || 'Polla Total Gol',
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
                Primera división, amistosos de selecciones mayores y
                eliminatorias de mayores, con partidos que todavía no
                empiezan, de aquí al domingo. Todavía no está en la base. Al
                abrir la inscripción se guardan los partidos que elijas.
              </p>
            </div>
            <div
              className={`rounded-xl px-6 py-4 text-center ${
                selectedIds.length > 0
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              <p className="text-3xl font-black">{selectedIds.length}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {selectedIds.length === 1 ? 'partido' : 'partidos'}
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
              Consultando los partidos de la semana...
            </p>
          ) : championships.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
              No hay partidos de primera división, amistosos ni eliminatorias de mayores pendientes hasta el domingo.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setChampionshipPage(1);
                  }}
                  placeholder="Buscar campeonato o equipo"
                  className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-red-500"
                />
                <div className="space-y-2 pr-1">
                  {pagedChampionships.map((championship) => {
                    const key = `${championship.leagueId}:${championship.season}`;
                    const active = key === selectedKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedKey(key);
                          setMatchPage(1);
                        }}
                        className={`w-full rounded-xl px-4 py-3 text-left ${
                          active ? 'bg-red-600' : 'bg-slate-950/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="block font-bold">{leagueNameEs(championship.name, championship.country)}</span>
                        <span className={`mt-1 block text-xs ${active ? 'text-red-100' : 'text-slate-400'}`}>
                          {countryNameEs(championship.country)} · {championship.upcoming} partidos
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
                <Pager
                  page={championshipPageSafe}
                  total={visibleChampionships.length}
                  onPage={setChampionshipPage}
                />
              </aside>

              <section className="space-y-5">
                {pagedRounds.map((round, index) => (
                  <article
                    key={`${round.roundName}-${index}`}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  >
                    <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-black">{roundNameEs(round.roundName)}</h2>
                        <p className="text-sm text-slate-400">
                          {round.roundSize}{' '}
                          {round.roundSize === 1 ? 'partido' : 'partidos'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          useRound(
                            (selectedChampionship?.rounds.find(
                              (item) => item.roundName === round.roundName,
                            )?.matches ?? round.matches)
                              .filter(canSelect)
                              .map((match) => match.id),
                          )
                        }
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10"
                      >
                        Usar esta jornada
                      </button>
                    </div>
                    <div className="divide-y divide-white/5">
                      {round.matches.map((match) => {
                        const selected = selectedIds.includes(match.id);
                        const playable = canSelect(match);
                        const disabled = !playable;
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
                                {teamNameEs(match.homeTeam)} vs {teamNameEs(match.awayTeam)}
                              </span>
                              <span className="mt-1 block text-sm text-slate-400">
                                {formatKickoff(match.date)}
                                {playable ? '' : ' · Ya empezó'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}

                <Pager
                  page={matchPageSafe}
                  total={listedMatches.length}
                  onPage={setMatchPage}
                />

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
                            {match.championship}: {teamNameEs(match.homeTeam)} vs {teamNameEs(match.awayTeam)}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving || selectedIds.length < 1}
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
