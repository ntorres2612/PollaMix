
"use client";

import { usePredictionContext } from "@/context/PredictionContext";

interface PredictionProgressProps {
  tournamentId: number;
  predictionsSubmittedAt?: string | null;
}

export default function PredictionProgress({
  tournamentId,
  predictionsSubmittedAt = null,
}: PredictionProgressProps) {
  const { predictions } = usePredictionContext();

  const savedCount = Object.values(predictions).filter(
    (prediction) =>
      prediction.tournamentId === tournamentId,
  ).length;

  const confirmed = Boolean(predictionsSubmittedAt);

  const total = confirmed ? 10 : savedCount;

  return (
    <div className="my-16 rounded-xl bg-red-600 p-6 text-center">
      <h2 className="text-3xl font-black">
        Pronósticos realizados
      </h2>

      <p className="mt-5 text-5xl font-black">
        {total} / 10
      </p>

      {confirmed && (
        <p className="mt-3 text-sm font-semibold text-white">
          ✓ Pronósticos confirmados definitivamente
        </p>
      )}
    </div>
  );
}
