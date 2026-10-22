
"use client";

import type { PredictionSelection } from "@/lib/predictions";

interface MatchSelectorProps {
  matchId: number;
  selection: PredictionSelection | null;
  onSelectionChange: (
    matchId: number,
    selection: PredictionSelection,
  ) => void;
  disabled: boolean;
}

export default function MatchSelector({
  matchId,
  selection,
  onSelectionChange,
  disabled,
}: MatchSelectorProps) {
  const options: {
    value: PredictionSelection;
    label: string;
  }[] = [
    { value: "HOME", label: "Local" },
    { value: "DRAW", label: "Empate" },
    { value: "AWAY", label: "Visitante" },
  ];

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <p className="mb-3 text-sm font-semibold text-slate-300">
        Tu pronóstico
      </p>

      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = selection === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() =>
                onSelectionChange(matchId, option.value)
              }
              aria-pressed={selected}
              className={`
                rounded-xl
                border
                px-3
                py-3
                text-sm
                font-bold
                transition
                ${
                  selected
                    ? "border-red-500 bg-red-600 text-white"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-red-500"
                }
                disabled:cursor-not-allowed
                disabled:opacity-60
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="mt-3 text-xs text-slate-400">
          La selección de pronósticos está bloqueada.
        </p>
      )}
    </div>
  );
}
