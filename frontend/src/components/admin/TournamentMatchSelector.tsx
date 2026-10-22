'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  getAvailableTournamentMatches,
  getSelectedTournamentMatchesResponse,
  selectTournamentMatches,
} from '@/lib/tournaments';

import { ApiMatch } from '@/types/match';

interface TournamentMatchSelectorProps {
  tournamentId: number;
}

interface WeekGroup {
  key: string;
  label: string;
  matches: ApiMatch[];
}

function getWeekStart(date: Date) {
  const result = new Date(date);

  const day = result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + diff,
  );

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

function getWeekKey(date: Date) {
  const start = getWeekStart(date);

  return `${start.getFullYear()}-${String(
    start.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    start.getDate(),
  ).padStart(2, '0')}`;
}

function formatWeekLabel(date: Date) {
  const start =
    getWeekStart(date);

  const end = new Date(start);

  end.setDate(
    end.getDate() + 6,
  );

  const startLabel =
    start.toLocaleDateString(
      'es-CO',
      {
        day: '2-digit',
        month: 'short',
      },
    );

  const endLabel =
    end.toLocaleDateString(
      'es-CO',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );

  return `Semana del ${startLabel} al ${endLabel}`;
}

export default function TournamentMatchSelector({
  tournamentId,
}: TournamentMatchSelectorProps) {

  const [matches, setMatches] =
    useState<ApiMatch[]>([]);

  const [selectedIds, setSelectedIds] =
    useState<number[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [locked, setLocked] =
    useState(false);

  const [predictionsCount, setPredictionsCount] =
    useState(0);

  useEffect(() => {

    async function loadMatches() {

      try {

        setLoading(true);

        setError('');

        setSuccess('');

        const [
          available,
          selectedResponse,
        ] = await Promise.all([

          getAvailableTournamentMatches(
            tournamentId,
          ),

          getSelectedTournamentMatchesResponse(
            tournamentId,
          ),

        ]);

        /*
         * Partidos actualmente seleccionados.
         */
        const selected =
          selectedResponse.matches;

        /*
         * Cantidad de pronósticos realizados
         * sobre esta Polla.
         */
        const currentPredictionsCount =
          selectedResponse.predictionsCount;

        setPredictionsCount(
          currentPredictionsCount,
        );

        /*
         * Si existe al menos un pronóstico,
         * la selección queda bloqueada.
         */
        const isLocked =
          currentPredictionsCount > 0;

        setLocked(isLocked);

        /*
         * IDs de partidos seleccionados.
         */
        const selectedIdsFromResponse =
          selected.map(
            (match) => match.id,
          );

        /*
         * IDs de partidos disponibles actualmente.
         */
        const availableIds =
          new Set(
            available.map(
              (match) => match.id,
            ),
          );

        /*
         * Agregamos los partidos seleccionados
         * aunque ya no sean futuros.
         *
         * Esto evita el problema:
         *
         * 10 seleccionados
         * ↓
         * 6 ya pasaron
         * ↓
         * frontend los elimina
         * ↓
         * aparece 4/10
         */
        const selectedOnly =
          selected.filter(
            (match) =>
              !availableIds.has(match.id),
          );

        /*
         * Lista final:
         *
         * - futuros disponibles
         * - seleccionados que ya no están
         *   entre los futuros
         */
        const mergedMatches = [
          ...available,
          ...selectedOnly,
        ];

        /*
         * Ordenamos por fecha.
         */
        mergedMatches.sort(
          (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime(),
        );

        setMatches(
          mergedMatches,
        );

        /*
         * IMPORTANTE:
         *
         * Si está bloqueado:
         * conservar los 10 seleccionados
         * exactamente como están guardados.
         *
         * Si todavía no está bloqueado:
         * utilizamos los seleccionados actuales.
         */
        if (isLocked) {

          setSelectedIds(
            selectedIdsFromResponse,
          );

        } else {

          setSelectedIds(
            selectedIdsFromResponse,
          );

        }

      } catch (error) {

        console.error(
          'Error cargando partidos para selección:',
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar los partidos.',
        );

      } finally {

        setLoading(false);

      }

    }

    loadMatches();

  }, [tournamentId]);

  const groupedWeeks =
    useMemo<WeekGroup[]>(() => {

      const groups =
        new Map<
          string,
          WeekGroup
        >();

      for (const match of matches) {

        const date =
          new Date(match.date);

        const key =
          getWeekKey(date);

        if (!groups.has(key)) {

          groups.set(
            key,
            {
              key,
              label:
                formatWeekLabel(
                  date,
                ),
              matches: [],
            },
          );

        }

        groups
          .get(key)!
          .matches
          .push(match);
      }

      return Array.from(
        groups.values(),
      ).sort(
        (a, b) =>
          a.key.localeCompare(
            b.key,
          ),
      );

    }, [matches]);

  function toggleMatch(
    matchId: number,
  ) {

    /*
     * Seguridad adicional:
     * si la Polla está bloqueada,
     * no permitimos cambios.
     */
    if (locked) {
      return;
    }

    setSuccess('');

    setError('');

    setSelectedIds(
      (current) => {

        /*
         * Si ya estaba seleccionado,
         * lo quitamos.
         */
        if (
          current.includes(matchId)
        ) {

          return current.filter(
            (id) =>
              id !== matchId,
          );

        }

        /*
         * Máximo 10.
         */
        if (
          current.length >= 10
        ) {

          return current;

        }

        return [
          ...current,
          matchId,
        ];

      },
    );
  }

  async function handleSave() {

    /*
     * Nunca intentamos guardar
     * si la selección está bloqueada.
     */
    if (locked) {

      setError(
        'La selección está bloqueada porque ya existen pronósticos realizados.',
      );

      return;
    }

    if (
      selectedIds.length !== 10
    ) {

      setError(
        'Debes seleccionar exactamente 10 partidos.',
      );

      return;

    }

    try {

      setSaving(true);

      setError('');

      setSuccess('');

      await selectTournamentMatches(
        tournamentId,
        selectedIds,
      );

      setSuccess(
        'Los 10 partidos fueron guardados correctamente.',
      );

    } catch (error) {

      console.error(
        'Error guardando partidos seleccionados:',
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar la selección.',
      );

    } finally {

      setSaving(false);

    }
  }

  if (loading) {

    return (
      <div className="py-12 text-center text-slate-400">
        Cargando partidos...
      </div>
    );

  }

  return (

    <div className="space-y-8">

      {/* HEADER */}

      <div className="sticky top-4 z-20 rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl backdrop-blur">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
              Administración
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              Seleccionar partidos para la Polla
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              El administrador selecciona los 10 partidos.
              Los jugadores serán quienes ingresen los
              marcadores.
            </p>

          </div>

          <div
            className={`rounded-xl px-6 py-4 text-center ${
              selectedIds.length === 10
                ? 'bg-green-500/15 text-green-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >

            <div className="text-3xl font-black">

              {selectedIds.length}

              <span className="text-slate-500">
                {' '}
                / 10
              </span>

            </div>

            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              Seleccionados
            </div>

          </div>

        </div>

        {/* BLOQUEO */}

        {locked && (

          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">

            <div className="flex items-start gap-3">

              <div className="mt-0.5 text-xl">
                🔒
              </div>

              <div>

                <p className="font-bold text-amber-400">
                  Selección bloqueada
                </p>

                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  Esta Polla ya tiene{' '}
                  <span className="font-bold text-white">
                    {predictionsCount}
                  </span>{' '}
                  {predictionsCount === 1
                    ? 'pronóstico realizado'
                    : 'pronósticos realizados'}.
                  Los 10 partidos seleccionados
                  no pueden modificarse.
                </p>

              </div>

            </div>

          </div>

        )}

        {error && (

          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
            {error}
          </div>

        )}

        {success && (

          <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-green-400">
            {success}
          </div>

        )}

      </div>

      {/* PARTIDOS */}

      {matches.length === 0 ? (

        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
          No hay partidos futuros disponibles.
        </div>

      ) : (

        groupedWeeks.map(
          (week) => (

            <section
              key={week.key}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >

              <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                  <h3 className="text-xl font-black text-white">
                    {week.label}
                  </h3>

                  <span className="text-sm text-slate-400">
                    {week.matches.length}{' '}
                    {week.matches.length === 1
                      ? 'partido'
                      : 'partidos'}
                  </span>

                </div>

              </div>

              <div className="divide-y divide-white/5">

                {week.matches.map(
                  (match) => {

                    const selected =
                      selectedIds.includes(
                        match.id,
                      );

                    const disabled =
                      locked ||
                      (
                        !selected &&
                        selectedIds.length >= 10
                      );

                    const matchDate =
                      new Date(
                        match.date,
                      );

                    return (

                      <button
                        key={match.id}
                        type="button"
                        onClick={() =>
                          toggleMatch(
                            match.id,
                          )
                        }
                        disabled={disabled}
                        className={`w-full p-5 text-left transition ${
                          selected
                            ? locked
                              ? 'cursor-not-allowed bg-amber-500/10'
                              : 'bg-red-500/10'
                            : disabled
                              ? 'cursor-not-allowed opacity-40'
                              : 'hover:bg-white/[0.04]'
                        }`}
                      >

                        <div className="flex items-center gap-4">

                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                              selected
                                ? locked
                                  ? 'border-amber-500 bg-amber-500 text-white'
                                  : 'border-red-500 bg-red-500 text-white'
                                : 'border-white/20 text-slate-500'
                            }`}
                          >

                            {selected
                              ? '✓'
                              : ''}

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">

                              <span className="font-bold text-white">
                                {match.homeTeam.name}
                              </span>

                              <span className="text-sm font-semibold text-red-400">
                                VS
                              </span>

                              <span className="font-bold text-white">
                                {match.awayTeam.name}
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">

                              <span>
                                {matchDate.toLocaleDateString(
                                  'es-CO',
                                  {
                                    weekday:
                                      'short',
                                    day:
                                      '2-digit',
                                    month:
                                      'short',
                                  },
                                )}
                              </span>

                              <span>
                                {matchDate.toLocaleTimeString(
                                  'es-CO',
                                  {
                                    hour:
                                      '2-digit',
                                    minute:
                                      '2-digit',
                                  },
                                )}
                              </span>

                              {match.matchday?.roundName && (

                                <span className="rounded-full bg-white/5 px-2 py-1 text-xs">
                                  {match.matchday.roundName}
                                </span>

                              )}

                            </div>

                          </div>

                          {selected && (

                            <span
                              className={`hidden text-sm font-bold sm:block ${
                                locked
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {locked
                                ? 'Bloqueado'
                                : 'Seleccionado'}
                            </span>

                          )}

                        </div>

                      </button>

                    );

                  },
                )}

              </div>

            </section>

          ),
        )

      )}

      {/* GUARDAR */}

      <div className="sticky bottom-4 z-20">

        <button
          type="button"
          onClick={handleSave}
          disabled={
            locked ||
            selectedIds.length !== 10 ||
            saving
          }
          className={`w-full rounded-2xl px-6 py-5 text-lg font-black shadow-2xl transition ${
            locked
              ? 'cursor-not-allowed bg-amber-500/10 text-amber-400'
              : selectedIds.length === 10 &&
                  !saving
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'cursor-not-allowed bg-white/10 text-slate-500'
          }`}
        >

          {locked

            ? '🔒 Selección bloqueada'

            : saving

              ? 'Guardando selección...'

              : selectedIds.length === 10

                ? 'Guardar 10 partidos'

                : `Selecciona ${
                    10 - selectedIds.length
                  } partidos más`}

        </button>

      </div>

    </div>

  );

}