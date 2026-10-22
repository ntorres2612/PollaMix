"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getPredictions,
  PredictionResponse,
} from "@/lib/predictions";

import { getCurrentUser } from "@/lib/auth";

export interface Prediction {
  matchId: number;
  tournamentId: number;
  homeScore: number;
  awayScore: number;
  id?: number;
  points?: number;
}

interface ContextProps {
  predictions: Record<string, Prediction>;
  setPrediction: (prediction: Prediction) => void;
  removePrediction: (
    matchId: number,
    tournamentId: number,
  ) => void;
  getPrediction: (
    matchId: number,
    tournamentId: number,
  ) => Prediction | undefined;
}

const PredictionContext =
  createContext<ContextProps | null>(null);

export function PredictionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [predictions, setPredictions] = useState<
    Record<string, Prediction>
  >({});

  function getKey(
    matchId: number,
    tournamentId: number,
  ) {
    return `${tournamentId}-${matchId}`;
  }

 useEffect(() => {
  const user = getCurrentUser();

  // Solo los PLAYER necesitan cargar sus pronósticos.
  if (!user || user.role !== "PLAYER") {
    setPredictions({});
    return;
  }

  async function loadPredictions() {
    try {
      const data: PredictionResponse[] =
        await getPredictions();

      const mapped: Record<string, Prediction> = {};

      for (const prediction of data) {
        const key = getKey(
          prediction.matchId,
          prediction.tournamentId,
        );

        mapped[key] = {
          matchId: prediction.matchId,
          tournamentId: prediction.tournamentId,
          homeScore: prediction.homeScore,
          awayScore: prediction.awayScore,
          id: prediction.id,
          points: prediction.points,
        };
      }

      setPredictions(mapped);
    } catch (error) {
      console.error(
        "Error cargando pronósticos:",
        error,
      );
    }
  }

  loadPredictions();
}, []);

  function setPrediction(prediction: Prediction) {
    const key = getKey(
      prediction.matchId,
      prediction.tournamentId,
    );

    setPredictions((prev) => ({
      ...prev,
      [key]: prediction,
    }));
  }

  function removePrediction(
    matchId: number,
    tournamentId: number,
  ) {
    const key = getKey(matchId, tournamentId);

    setPredictions((prev) => {
      const next = { ...prev };

      delete next[key];

      return next;
    });
  }

  function getPrediction(
    matchId: number,
    tournamentId: number,
  ) {
    return predictions[
      getKey(matchId, tournamentId)
    ];
  }

  return (
    <PredictionContext.Provider
      value={{
        predictions,
        setPrediction,
        removePrediction,
        getPrediction,
      }}
    >
      {children}
    </PredictionContext.Provider>
  );
}

export function usePredictionContext() {
  const context = useContext(PredictionContext);

  if (!context) {
    throw new Error(
      "PredictionProvider no encontrado.",
    );
  }

  return context;
}
