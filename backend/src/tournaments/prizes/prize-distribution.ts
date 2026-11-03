export interface PrizeCandidate {
  userId: number;
  points: number;
}

export interface PrizeWinner {
  userId: number;
  points: number;
  position: number;
  amountCOP: number;
}

export interface PrizeDistribution {
  currency: 'COP';
  revenueCOP: number;
  prizePoolCOP: number;
  profitCOP: number;
  firstCOP: number;
  secondCOP: number;
  thirdCOP: number;
  allocatedCOP: number;
  undistributedCOP: number;
  winners: PrizeWinner[];
}

export function calculatePrizeDistribution(
  revenueCOP: number,
  candidates: PrizeCandidate[],
): PrizeDistribution {
  if (
    !Number.isSafeInteger(revenueCOP) ||
    revenueCOP < 0
  ) {
    throw new Error('Recaudación COP inválida.');
  }

  const ids = new Set<number>();

  for (const candidate of candidates) {
    if (
      !Number.isSafeInteger(candidate.userId) ||
      candidate.userId <= 0 ||
      !Number.isSafeInteger(candidate.points) ||
      candidate.points < 0 ||
      ids.has(candidate.userId)
    ) {
      throw new Error('Participante o puntuación inválidos.');
    }

    ids.add(candidate.userId);
  }

  const prizePoolCOP = Math.round(
    revenueCOP * 6781 / 10000,
  );

  const profitCOP = revenueCOP - prizePoolCOP;

  const firstCOP = Math.round(prizePoolCOP * 0.70);
  const secondCOP = Math.round(prizePoolCOP * 0.20);
  const thirdCOP = prizePoolCOP - firstCOP - secondCOP;

  const amounts = [firstCOP, secondCOP, thirdCOP];

  const scores = [
    ...new Set(candidates.map((p) => p.points)),
  ].sort((a, b) => b - a);

  const winners: PrizeWinner[] = [];

  for (
    let position = 1;
    position <= Math.min(3, scores.length);
    position++
  ) {
    const points = scores[position - 1];
    const amount = amounts[position - 1];

    // Un mismo puntaje representa una misma posición.
    const tied = candidates
      .filter((p) => p.points === points)
      .sort((a, b) => a.userId - b.userId);

    const base = Math.floor(amount / tied.length);
    const remainder = amount % tied.length;

    tied.forEach((player, index) => {
      winners.push({
        userId: player.userId,
        points: player.points,
        position,
        amountCOP: base + (index < remainder ? 1 : 0),
      });
    });
  }

  const allocatedCOP = winners.reduce(
    (sum, winner) => sum + winner.amountCOP,
    0,
  );

  return {
    currency: 'COP',
    revenueCOP,
    prizePoolCOP,
    profitCOP,
    firstCOP,
    secondCOP,
    thirdCOP,
    allocatedCOP,
    undistributedCOP: prizePoolCOP - allocatedCOP,
    winners,
  };
}
