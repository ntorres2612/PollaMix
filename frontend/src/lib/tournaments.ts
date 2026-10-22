import { apiFetch } from "@/lib/api";

import { ApiMatch } from "@/types/match";

interface SelectedTournamentMatchesResponse {
  tournament: {
    id: number;
    name: string;
    season: number;
    leagueId: number;
  };

  predictionsCount: number;

  matches: ApiMatch[];
}

export interface Tournament {
  id: number;

  name: string;

  description?: string | null;

  leagueId: number;

  season: number;

  inscription: number;

  prize: number;

  maxPlayers: number;

  registrationStartsAt: string;

  registrationEndsAt: string;

  startsAt: string;

  endsAt: string;

  active: boolean;
}

export async function getCurrentTournament(): Promise<
  Tournament | null
> {
  return apiFetch<Tournament | null>(
    "/tournaments/current",
  );
}

export async function getCurrentPlayerTournament(): Promise<
  Tournament | null
> {
  return apiFetch<Tournament | null>(
    "/tournaments/my-current",
  );
}

export async function getAvailableTournamentMatches(
  tournamentId: number,
): Promise<ApiMatch[]> {
  return apiFetch<ApiMatch[]>(
    `/tournaments/${tournamentId}/available-matches`,
  );
}

export async function getSelectedTournamentMatchesResponse(
  tournamentId: number,
): Promise<SelectedTournamentMatchesResponse> {
  return apiFetch<SelectedTournamentMatchesResponse>(
    `/tournaments/${tournamentId}/matches`,
  );
}

export async function getSelectedTournamentMatches(
  tournamentId: number,
): Promise<ApiMatch[]> {
  const response =
    await getSelectedTournamentMatchesResponse(
      tournamentId,
    );

  return response.matches;
}

export async function selectTournamentMatches(
  tournamentId: number,
  matchIds: number[],
) {
  return apiFetch(
    `/tournaments/${tournamentId}/selected-matches`,
    {
      method: "PUT",

      body: JSON.stringify({
        matchIds,
      }),
    },
  );
}

export async function getTournaments(): Promise<
  Tournament[]
> {
  return apiFetch<Tournament[]>(
    "/tournaments",
  );
}

export interface TournamentParticipant {
  id: number;

  userId: number;

  tournamentId: number;

  paid: boolean;

  user: {
    id: number;

    name: string;

    email: string;
  };
}

export interface TournamentDetail
  extends Tournament {
  participants: TournamentParticipant[];
}

export interface TournamentRankingEntry {
  position: number;

  id: number;

  name: string;

  points: number;
}

export async function getTournament(
  tournamentId: number,
): Promise<TournamentDetail> {
  return apiFetch<TournamentDetail>(
    `/tournaments/${tournamentId}`,
  );
}

export async function getTournamentRanking(
  tournamentId: number,
): Promise<TournamentRankingEntry[]> {
  return apiFetch<TournamentRankingEntry[]>(
    `/tournaments/${tournamentId}/ranking`,
  );
}


export interface TournamentParticipationStatus {
  tournamentId: number;

  active: boolean;

  registrationOpen: boolean;

  registrationStartsAt: string;

  registrationEndsAt: string;

  startsAt: string;

  endsAt: string;

  predictionsCloseAt: string | null;

  predictionsSubmittedAt: string | null;

  inscription: number;

  prize: number;

  maxPlayers: number;

  participantsCount: number;

  isParticipant: boolean;

  paid: boolean;
}


export async function joinTournament(
  tournamentId: number,
) {
  return apiFetch(
    `/tournaments/${tournamentId}/join`,
    {
      method: "POST",
    },
  );
}

export async function getTournamentMyStatus(
  tournamentId: number,
): Promise<TournamentParticipationStatus> {
  return apiFetch<TournamentParticipationStatus>(
    `/tournaments/${tournamentId}/my-status`,
  );
}

/* ============================================================
   PAGOS
   ============================================================ */

export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface TournamentPayment {
  id: number;

  amount: number;

  reference: string;

  status: PaymentStatus;

  method?: string | null;

  createdAt: string;

  paidAt?: string | null;

  userId: number;

  tournamentId: number;

  participantId?: number | null;

  participant?: {
    id: number;

    userId: number;

    tournamentId: number;

    paid: boolean;
  } | null;

  user?: {
    id: number;

    name: string;

    email: string;
  };
}

export interface CreatePaymentInput {
  tournamentId: number;
}

export async function createPayment(
  data: CreatePaymentInput,
): Promise<TournamentPayment> {
  return apiFetch<TournamentPayment>(
    "/payments",
    {
      method: "POST",

      body: JSON.stringify(data),
    },
  );
}

export async function getMyPayments(): Promise<
  TournamentPayment[]
> {
  return apiFetch<TournamentPayment[]>(
    "/payments/my",
  );
}

export async function getTournamentPayments(
  tournamentId: number,
): Promise<TournamentPayment[]> {
  return apiFetch<TournamentPayment[]>(
    `/payments/tournament/${tournamentId}`,
  );
}

export async function updatePaymentStatus(
  paymentId: number,
  status: PaymentStatus,
): Promise<TournamentPayment> {
  return apiFetch<TournamentPayment>(
    `/payments/${paymentId}/status`,
    {
      method: "PATCH",

      body: JSON.stringify({
        status,
      }),
    },
  );
}

/**
 * Función de compatibilidad.
 *
 * Busca el pago pendiente asociado al participante
 * y lo aprueba utilizando el endpoint real de Payments.
 */
export async function approveParticipantPayment(
  tournamentId: number,
  participantId: number,
) {
  const payments =
    await getTournamentPayments(
      tournamentId,
    );

  const pendingPayment =
    payments.find(
      (payment) =>
        payment.participantId ===
          participantId &&
        payment.status ===
          "PENDING",
    );

  if (!pendingPayment) {
    const approvedPayment =
      payments.find(
        (payment) =>
          payment.participantId ===
            participantId &&
          payment.status ===
            "APPROVED",
      );

    if (approvedPayment) {
      return approvedPayment;
    }

    throw new Error(
      "No existe un pago pendiente para este participante.",
    );
  }

  return updatePaymentStatus(
    pendingPayment.id,
    "APPROVED",
  );
}