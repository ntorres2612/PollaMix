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
  currency: "COP" | "USD";

  prize: number;

  maxPlayers: number;

  participantsCount?: number;

  predictionsCount?: number;

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

/**
 * Obtiene las Pollas en las que está inscrito
 * el usuario autenticado, incluidas las finalizadas.
 *
 * GET /tournaments/my-history
 */
export async function getMyTournamentHistory(): Promise<Tournament[]> {
  return apiFetch<Tournament[]>(
    "/tournaments/my-history",
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

export interface UpcomingMatch {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
}

export interface UpcomingRound {
  id: number;
  roundName: string;
  number: number | null;
  matches: UpcomingMatch[];
}

export interface UpcomingChampionship {
  leagueId: number;
  season: number;
  name: string;
  country: string;
  upcoming: number;
  rounds: UpcomingRound[];
}

export async function getUpcomingBoard(): Promise<{
  championships: UpcomingChampionship[];
}> {
  return apiFetch('/tournaments/upcoming-board');
}

export async function openTournament(input: {
  name: string;
  description?: string;
  inscription: number;
  currency: 'COP' | 'USD';
  matchIds: number[];
}): Promise<Tournament> {
  return apiFetch<Tournament>('/tournaments/open', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getTournaments(): Promise<
  Tournament[]
> {
  return apiFetch<Tournament[]>(
    "/tournaments",
  );
}

export interface AdminSlip {
  key: string;
  participantId: number;
  userId: number;
  name: string;
  email: string;
  slipNumber: number;
  entryId: number | null;
  payment: TournamentPayment | null;
  paid: boolean;
}

export function buildAdminSlips(
  participants: TournamentParticipant[],
  payments: TournamentPayment[],
): AdminSlip[] {
  const slips: AdminSlip[] = [];

  for (const participant of participants) {
    const ownPayments = payments.filter(
      (payment) =>
        payment.participantId === participant.id ||
        payment.userId === participant.userId,
    );

    const latestBySlip = new Map<string, TournamentPayment>();

    for (const payment of ownPayments) {
      const slipKey =
        payment.entryId != null
          ? `entry-${payment.entryId}`
          : `payment-${payment.id}`;
      const current = latestBySlip.get(slipKey);

      if (!current || payment.id > current.id) {
        latestBySlip.set(slipKey, payment);
      }
    }

    const ordered = [...latestBySlip.values()].sort(
      (left, right) => left.id - right.id,
    );

    if (ordered.length === 0) {
      slips.push({
        key: `participant-${participant.id}`,
        participantId: participant.id,
        userId: participant.userId,
        name: participant.user.name,
        email: participant.user.email,
        slipNumber: 1,
        entryId: null,
        payment: null,
        paid: participant.paid,
      });
      continue;
    }

    ordered.forEach((payment, index) => {
      const slipNumber = index + 1;

      slips.push({
        key: `payment-${payment.id}`,
        participantId: participant.id,
        userId: participant.userId,
        name:
          ordered.length > 1
            ? `${participant.user.name} · Pronóstico ${slipNumber}`
            : participant.user.name,
        email: participant.user.email,
        slipNumber,
        entryId: payment.entryId ?? null,
        payment,
        paid: payment.status === "APPROVED",
      });
    });
  }

  return slips.sort((left, right) => {
    const priority = (slip: AdminSlip) =>
      slip.payment?.status === "PENDING" ? 0 : slip.paid ? 2 : 1;
    const difference = priority(left) - priority(right);

    if (difference !== 0) {
      return difference;
    }

    return left.name.localeCompare(right.name, "es");
  });
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

  userId?: number;

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

export interface PollEntrySummary {
  id: number;
  number: number;
  paid: boolean;
  pending: boolean;
  predictionsSubmittedAt: string | null;
  payment: {
    id: number;
    status: string;
    amount: number;
    reference: string;
  } | null;
  predictions: {
    matchId: number;
    selection: "HOME" | "DRAW" | "AWAY";
    points: number;
  }[];
}

export async function getMyEntries(
  tournamentId: number,
): Promise<PollEntrySummary[]> {
  return apiFetch<PollEntrySummary[]>(
    `/tournaments/${tournamentId}/my-entries`,
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

  predictionsCount?: number;

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
  currency: "COP" | "USD";

  reference: string;

  status: PaymentStatus;

  method?: string | null;

  createdAt: string;

  paidAt?: string | null;

  userId: number;

  tournamentId: number;

  participantId?: number | null;

  entryId?: number | null;

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
  entryId?: number;
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

export interface TournamentPrizeWinner {
  userId: number;
  entryId?: number;
  name: string;
  points: number;
  position: number;
  amountCOP: number;
  paid?: boolean;
}

export interface TournamentPrizesResponse {
  finalized?: boolean;
  closedAt?: string | null;
  tournamentId: number;
  published: boolean;
  winnersPublished: boolean;
  resultsReady?: boolean;
  paymentsReady?: boolean;
  tournamentEnded?: boolean;
  currency: "COP";
  registeredPaidPlayers?: number;
  revenueCOP?: number;
  prizePoolCOP?: number;
  profitCOP?: number;
  prizes: {
    first: number;
    second: number;
    third: number;
  } | null;
  winners: TournamentPrizeWinner[] | null;
  allocatedCOP?: number | null;
  undistributedCOP?: number | null;
  message?: string;
}

export async function getTournamentPrizes(
  tournamentId: number,
): Promise<TournamentPrizesResponse> {
  return apiFetch<TournamentPrizesResponse>(
    `/tournaments/${tournamentId}/prizes`,
  );
}


// Cierre definitivo: solo disponible para administradores.
// El servidor mantiene la operación deshabilitada hasta su validación.
export async function closeTournamentPrizes(
  tournamentId: number,
): Promise<unknown> {
  return apiFetch(
    `/tournaments/${tournamentId}/close-prizes`,
    { method: 'POST' },
  );
}


export interface PublicPrizeHistory {
  id: number;
  name: string;
  season: number;
  closedAt: string;
}

export interface PublicPrizesResponse {
  tournamentId: number;
  published: boolean;
  finalized?: boolean;
  closedAt?: string | null;
  currency: "COP";
  prizes: {
    first: number;
    second: number;
    third: number;
  } | null;
  message?: string;
}

export async function getPrizeHistory(): Promise<PublicPrizeHistory[]> {
  return apiFetch<PublicPrizeHistory[]>(
    "/tournaments/prizes/history",
  );
}

export interface MyPrize {
  tournamentId: number;
  tournamentName: string;
  season: number;
  closedAt: string | null;
  position: number;
  points: number;
  amountCOP: number;
  provisional?: boolean;
  concept?: "ganancia";
  paid?: boolean;
}

export interface MyPrizes {
  currency: "COP";
  balanceKind?: "profit" | "winnings";
  balanceCOP: number;
  history: MyPrize[];
}

export interface MyPrizes {
  currency: "COP";
  balanceCOP: number;
  history: MyPrize[];
}

export async function getMyPrizes(): Promise<MyPrizes> {
  return apiFetch<MyPrizes>("/tournaments/my-prizes");
}

export async function getTournamentPrizesAdmin(
  tournamentId: number,
): Promise<TournamentPrizesResponse> {
  return apiFetch<TournamentPrizesResponse>(
    `/tournaments/${tournamentId}/prizes/admin`,
  );
}

export async function markWinnerPaid(
  tournamentId: number,
  entryId: number,
) {
  return apiFetch(
    `/tournaments/${tournamentId}/prize-payouts`,
    {
      method: "POST",
      body: JSON.stringify({ entryId }),
    },
  );
}
