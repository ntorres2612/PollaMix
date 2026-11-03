export interface PrizePublicationConditions {
  tournamentEnded: boolean;
  matchesReady: boolean;
  paymentsReady: boolean;
}

export function canPublishWinners(
  conditions: PrizePublicationConditions,
): boolean {
  return (
    conditions.tournamentEnded === true &&
    conditions.matchesReady === true &&
    conditions.paymentsReady === true
  );
}
