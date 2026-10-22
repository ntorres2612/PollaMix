import { calculateScore } from './score-calculator';

describe('PollaMix - cálculo de puntuación', () => {
  it('asigna 1 punto cuando gana el local', () => {
    expect(calculateScore(1, 0, 3, 1)).toBe(1);
  });

  it('asigna 1 punto cuando hay empate', () => {
    expect(calculateScore(0, 0, 2, 2)).toBe(1);
  });

  it('asigna 1 punto cuando gana el visitante', () => {
    expect(calculateScore(0, 1, 1, 4)).toBe(1);
  });

  it('asigna 0 puntos cuando se pronostica local y hay empate', () => {
    expect(calculateScore(1, 0, 1, 1)).toBe(0);
  });

  it('asigna 0 puntos cuando se pronostica empate y gana visitante', () => {
    expect(calculateScore(0, 0, 0, 2)).toBe(0);
  });

  it('asigna 0 puntos cuando se pronostica visitante y gana local', () => {
    expect(calculateScore(0, 1, 2, 0)).toBe(0);
  });

  it('no exige acertar el marcador exacto', () => {
    expect(calculateScore(1, 0, 5, 2)).toBe(1);
  });

  it('devuelve el mismo puntaje al recalcular', () => {
    const primero = calculateScore(1, 0, 2, 1);
    const segundo = calculateScore(1, 0, 2, 1);

    expect(primero).toBe(1);
    expect(segundo).toBe(primero);
  });
});
