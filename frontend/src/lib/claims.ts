import { apiFetch } from "@/lib/api";

export type ClaimStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED";

export interface TournamentClaim {
  id: number;
  tournamentId: number;
  userId: number;
  reason: string;
  status: ClaimStatus;
  decision: string | null;
  createdAt: string;
  resolvedAt: string | null;

  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateClaimResponse {
  id: number;
  tournamentId: number;
  reason: string;
  status: ClaimStatus;
  createdAt: string;
}

export interface PublishResultsResponse {
  tournamentId: number;
  resultsPublishedAt: string;
  claimsDeadlineAt: string;
  status: "CLAIMS_OPEN";
}

export interface TournamentClaimsResponse {
  tournament: {
    id: number;
    name: string;
    resultsPublishedAt: string | null;
  };
  claims: TournamentClaim[];
  total: number;
}

export interface DecideClaimResponse {
  id: number;
  tournamentId: number;
  status: ClaimStatus;
  decision: string;
  createdAt: string;
  resolvedAt: string | null;
  correctionPending: boolean;
}

export interface ApplyCorrectionRequest {
  matchId: number;
  homeScore: number;
  awayScore: number;
  reason: string;
  officialResultVerified: true;
}

function validateReason(reason: string): string {
  const cleaned = reason.trim();

  if (cleaned.length < 20 || cleaned.length > 2000) {
    throw new Error(
      "La justificación debe tener entre 20 y 2000 caracteres.",
    );
  }

  return cleaned;
}

function validateId(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Identificador inválido.");
  }
}

/**
 * JUGADOR
 * Crear una reclamación sobre resultados publicados.
 *
 * El backend valida:
 * - inscripción
 * - pago aprobado
 * - publicación de resultados
 * - plazo de 48 horas
 * - ausencia de reclamación pendiente
 */
export async function createTournamentClaim(
  tournamentId: number,
  reason: string,
): Promise<CreateClaimResponse> {
  validateId(tournamentId);

  return apiFetch<CreateClaimResponse>(
    `/tournaments/${tournamentId}/claims`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: validateReason(reason),
      }),
    },
  );
}

/**
 * ADMIN
 * Publicar los resultados oficiales.
 */
export async function publishTournamentResults(
  tournamentId: number,
): Promise<PublishResultsResponse> {
  validateId(tournamentId);

  return apiFetch<PublishResultsResponse>(
    `/tournaments/${tournamentId}/publish-results`,
    {
      method: "POST",
    },
  );
}

/**
 * ADMIN
 * Consultar reclamaciones del torneo.
 */
export async function getTournamentClaims(
  tournamentId: number,
): Promise<TournamentClaimsResponse> {
  validateId(tournamentId);

  return apiFetch<TournamentClaimsResponse>(
    `/tournaments/${tournamentId}/claims`,
  );
}

/**
 * ADMIN
 * Aceptar o rechazar una reclamación.
 */
export async function decideTournamentClaim(
  tournamentId: number,
  claimId: number,
  status: "ACCEPTED" | "REJECTED",
  decision: string,
): Promise<DecideClaimResponse> {
  validateId(tournamentId);
  validateId(claimId);

  return apiFetch<DecideClaimResponse>(
    `/tournaments/${tournamentId}/claims/${claimId}/decision`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        decision: validateReason(decision),
      }),
    },
  );
}

/**
 * ADMIN
 * Aplicar una corrección oficial.
 *
 * No se debe llamar sin verificar previamente
 * el resultado oficial de los 90 minutos.
 */
export async function applyTournamentClaimCorrection(
  tournamentId: number,
  claimId: number,
  correction: ApplyCorrectionRequest,
): Promise<unknown> {
  validateId(tournamentId);
  validateId(claimId);
  validateId(correction.matchId);

  if (
    !Number.isSafeInteger(correction.homeScore) ||
    !Number.isSafeInteger(correction.awayScore) ||
    correction.homeScore < 0 ||
    correction.awayScore < 0
  ) {
    throw new Error("El marcador corregido no es válido.");
  }

  if (correction.officialResultVerified !== true) {
    throw new Error(
      "Debes verificar el resultado oficial antes de aplicar la corrección.",
    );
  }

  return apiFetch<unknown>(
    `/tournaments/${tournamentId}/claims/${claimId}/apply-correction`,
    {
      method: "POST",
      body: JSON.stringify({
        ...correction,
        reason: validateReason(correction.reason),
      }),
    },
  );
}

/**
 * ADMIN
 * Resolver una reclamación aceptada sin cambiar el marcador.
 */
export interface NoCorrectionResolutionResponse {
  tournamentId: number;
  claimId: number;
  status: "ACCEPTED";
  resolvedAt: string;
  resolutionType: "WITHOUT_CORRECTION";
  audit: {
    id: number;
    claimId: number;
    adminId: number;
    reason: string;
    resolvedAt: string;
  };
}

export async function resolveTournamentClaimWithoutCorrection(
  tournamentId: number,
  claimId: number,
  reason: string,
  verified: boolean,
): Promise<NoCorrectionResolutionResponse> {
  validateId(tournamentId);
  validateId(claimId);

  if (verified !== true) {
    throw new Error(
      "Debes confirmar que no es necesario modificar el marcador.",
    );
  }

  return apiFetch<NoCorrectionResolutionResponse>(
    `/tournaments/${tournamentId}/claims/${claimId}/resolve-without-correction`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: validateReason(reason),
        noCorrectionVerified: true,
      }),
    },
  );
}
