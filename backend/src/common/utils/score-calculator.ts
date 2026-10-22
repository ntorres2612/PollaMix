
/**
 * Regla oficial de puntuación PollaMix.
 *
 * 1 punto: acierta ganador local, visitante o empate.
 * 0 puntos: resultado incorrecto.
 *
 * El marcador exacto no concede puntos adicionales.
 */
export function calculateScore(
  predictionHome: number,
  predictionAway: number,
  resultHome: number,
  resultAway: number,
): number {
  const predictedResult = Math.sign(
    predictionHome - predictionAway,
  );

  const actualResult = Math.sign(
    resultHome - resultAway,
  );

  return predictedResult === actualResult ? 1 : 0;
}
