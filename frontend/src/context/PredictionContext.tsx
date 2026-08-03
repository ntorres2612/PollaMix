"use client";

import { createContext, useContext, useState } from "react";

type Prediction = {
  [matchId: number]: string;
};

interface ContextProps {
  predictions: Prediction;
  setPrediction: (id: number, value: string) => void;
}

const PredictionContext = createContext<ContextProps | null>(null);

export function PredictionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [predictions, setPredictions] = useState<Prediction>({});

  function setPrediction(id: number, value: string) {
    setPredictions((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  return (
    <PredictionContext.Provider
      value={{
        predictions,
        setPrediction,
      }}
    >
      {children}
    </PredictionContext.Provider>
  );
}

export function usePredictionContext() {
  const context = useContext(PredictionContext);

  if (!context) {
    throw new Error("PredictionProvider no encontrado.");
  }

  return context;
}