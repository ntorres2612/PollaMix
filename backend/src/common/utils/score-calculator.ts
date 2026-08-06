export function calculateScore(

  predictionHome: number,

  predictionAway: number,

  resultHome: number,

  resultAway: number,

): number {

  // Marcador exacto
  if (

    predictionHome === resultHome &&
    predictionAway === resultAway

  ) {

    return 5;

  }

  const predictionDifference =
    predictionHome - predictionAway;

  const resultDifference =
    resultHome - resultAway;

  // Diferencia exacta
  if (

    predictionDifference === resultDifference

  ) {

    return 4;

  }

  const predictionWinner =
    Math.sign(predictionDifference);

  const resultWinner =
    Math.sign(resultDifference);

  // Ganador correcto
  if (

    predictionWinner === resultWinner

  ) {

    return 3;

  }

  // No acertó

  return 0;

}