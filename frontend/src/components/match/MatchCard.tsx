
"use client";

import Image from "next/image";

import { ApiMatch } from "@/types/match";
import type { PredictionSelection } from "@/lib/predictions";
import MatchSelector from "./MatchSelector";

interface MatchCardProps {
  match: ApiMatch;
  tournamentId: number;
  selection: PredictionSelection | null;
  onSelectionChange: (
    matchId: number,
    selection: PredictionSelection,
  ) => void;
  canPredict: boolean;
}

export default function MatchCard({
  match,
  tournamentId,
  selection,
  onSelectionChange,
  canPredict,
}: MatchCardProps) {
  const matchDate = new Date(match.date);

  const formattedDate = matchDate.toLocaleDateString(
    "es-CO",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );

  const formattedTime = matchDate.toLocaleTimeString(
    "es-CO",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const matchHasStarted =
    match.finished || matchDate.getTime() <= Date.now();

  return (
    <div
      className="
        bg-white/5
        backdrop-blur-md
        border
        border-white/10
        rounded-3xl
        p-6
        shadow-xl
        hover:scale-[1.02]
        hover:border-red-500
        hover:shadow-red-500/20
        transition-all
        duration-300
      "
    >
      {/* Información del partido */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        {/* LOCAL */}
        <div className="flex items-center gap-4">
          <Image
            src={match.homeTeam.logo}
            alt={match.homeTeam.name}
            width={55}
            height={55}
            className="object-contain"
          />

          <div>
            <h3 className="text-xl font-bold">
              {match.homeTeam.name}
            </h3>

            <p className="text-sm text-slate-400">
              Local
            </p>
          </div>
        </div>

        {/* CENTRO */}
        <div className="min-w-[130px] text-center">
          {match.finished ? (
            <>
              <p className="text-2xl font-black">
                {match.homeScore} - {match.awayScore}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Finalizado
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-red-500">
                VS
              </p>

              <p className="text-sm text-slate-300">
                {formattedDate}
              </p>

              <p className="text-xs text-slate-500">
                {formattedTime}
              </p>
            </>
          )}
        </div>

        {/* VISITANTE */}
        <div className="flex items-center justify-end gap-4">
          <div className="text-right">
            <h3 className="text-xl font-bold">
              {match.awayTeam.name}
            </h3>

            <p className="text-sm text-slate-400">
              Visitante
            </p>
          </div>

          <Image
            src={match.awayTeam.logo}
            alt={match.awayTeam.name}
            width={55}
            height={55}
            className="object-contain"
          />
        </div>
      </div>

      {/* Selector de pronóstico */}
      <MatchSelector
        matchId={match.id}
        selection={selection}
        onSelectionChange={onSelectionChange}
        disabled={!canPredict || matchHasStarted}
      />

      {matchHasStarted && (
        <p className="mt-3 text-xs text-amber-400">
          Este partido ya comenzó o finalizó.
        </p>
      )}
    </div>
  );
}
