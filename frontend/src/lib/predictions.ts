
import { apiFetch } from "./api";

export type PredictionSelection = "HOME" | "DRAW" | "AWAY";

export interface CreatePredictionData {
  matchId: number;
  tournamentId: number;
  homeScore: number;
  awayScore: number;
}

export interface PredictionResponse {
  id: number;
  homeScore: number;
  awayScore: number;
  points: number;
  createdAt: string;
  userId: number;
  matchId: number;
  tournamentId: number;
}

export interface SubmitPredictionItem {
  matchId: number;
  selection: PredictionSelection;
}

export interface SubmitPredictionsData {
  tournamentId: number;
  predictions: SubmitPredictionItem[];
}

export async function createPrediction(
  data: CreatePredictionData,
): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>(
    "/predictions",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function getPredictions(): Promise<
  PredictionResponse[]
> {
  return apiFetch<PredictionResponse[]>(
    "/predictions",
  );
}

export async function updatePrediction(
  id: number,
  data: Partial<
    Pick<CreatePredictionData, "homeScore" | "awayScore">
  >,
): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>(
    `/predictions/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function deletePrediction(
  id: number,
): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>(
    `/predictions/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function submitPredictions(
  data: SubmitPredictionsData,
): Promise<unknown> {
  if (data.predictions.length < 1) {
    throw new Error(
      "Debes seleccionar el resultado de cada partido.",
    );
  }

  const uniqueMatchIds = new Set(
    data.predictions.map((prediction) => prediction.matchId),
  );

  if (uniqueMatchIds.size !== data.predictions.length) {
    throw new Error(
      "Cada pronóstico debe corresponder a un partido diferente.",
    );
  }

  return apiFetch<unknown>(
    "/predictions/submit",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}
