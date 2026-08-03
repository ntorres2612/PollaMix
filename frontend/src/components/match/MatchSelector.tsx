"use client";

import { usePredictionContext } from "@/context/PredictionContext";

interface MatchSelectorProps {
  matchId: number;
}

export default function MatchSelector({
  matchId,
}: MatchSelectorProps) {
  const { predictions, setPrediction } = usePredictionContext();

  const options = [
    "Local",
    "Empate",
    "Visitante",
  ];

  return (
    <div className="flex flex-wrap gap-3 mt-5">

      {options.map((option) => (

        <button
          key={option}
          onClick={() => setPrediction(matchId, option)}
          className={`
            px-5
            py-2
            rounded-xl
            font-semibold
            transition-all
            duration-300
            hover:scale-105

            ${
              predictions[matchId] === option
                ? "bg-red-600 text-white shadow-lg shadow-red-600/40"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }
          `}
        >
          {option}
        </button>

      ))}

    </div>
  );
}