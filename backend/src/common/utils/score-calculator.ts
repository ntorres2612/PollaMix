export function calculateScore(
  predictionHome: number,
  predictionAway: number,
  resultHome: number,
  resultAway: number,
): number {
  const predictionDifference = predictionHome - predictionAway;
  const resultDifference = resultHome - resultAway;

  const predictionResult = Math.sign(predictionDifference);
  const actualResult = Math.sign(resultDifference);

  // 1 punto por acertar local, empate o visitante.
  return predictionResult === actualResult ? 1 : 0;
}

