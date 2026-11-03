import {
  calculatePrizeDistribution,
} from './prize-distribution';

describe('Distribución de premios PollaMix', () => {
  it('calcula 67,81 % de premios y 32,19 % de margen', () => {
    const result = calculatePrizeDistribution(
      480000,
      [
        { userId: 1, points: 100 },
        { userId: 2, points: 90 },
        { userId: 3, points: 80 },
      ],
    );

    expect(result.currency).toBe('COP');
    expect(result.prizePoolCOP).toBe(325488);
    expect(result.profitCOP).toBe(154512);
    expect(result.firstCOP).toBe(227842);
    expect(result.secondCOP).toBe(65098);
    expect(result.thirdCOP).toBe(32548);
    expect(result.undistributedCOP).toBe(0);
  });

  it('divide el primer puesto entre tres empatados', () => {
    const result = calculatePrizeDistribution(
      480000,
      [
        { userId: 3, points: 100 },
        { userId: 1, points: 100 },
        { userId: 2, points: 100 },
        { userId: 4, points: 95 },
        { userId: 5, points: 90 },
      ],
    );

    const first = result.winners.filter(
      (p) => p.position === 1,
    );

    expect(first).toHaveLength(3);
    expect(first.map((p) => p.amountCOP)).toEqual([
      75948,
      75947,
      75947,
    ]);

    expect(
      result.winners.find((p) => p.userId === 4)?.position,
    ).toBe(2);

    expect(
      result.winners.find((p) => p.userId === 5)?.position,
    ).toBe(3);
  });

  it('divide el segundo y tercer lugar entre empatados', () => {
    const result = calculatePrizeDistribution(
      480000,
      [
        { userId: 1, points: 100 },
        { userId: 2, points: 95 },
        { userId: 3, points: 95 },
        { userId: 4, points: 90 },
        { userId: 5, points: 90 },
      ],
    );

    const second = result.winners.filter(
      (p) => p.position === 2,
    );

    const third = result.winners.filter(
      (p) => p.position === 3,
    );

    expect(second.map((p) => p.amountCOP)).toEqual([
      32549,
      32549,
    ]);

    expect(third.map((p) => p.amountCOP)).toEqual([
      16274,
      16274,
    ]);

    expect(result.allocatedCOP).toBe(
      result.prizePoolCOP,
    );
  });

  it('no premia una cuarta puntuación distinta', () => {
    const result = calculatePrizeDistribution(
      480000,
      [
        { userId: 1, points: 100 },
        { userId: 2, points: 90 },
        { userId: 3, points: 80 },
        { userId: 4, points: 70 },
      ],
    );

    expect(
      result.winners.some((p) => p.userId === 4),
    ).toBe(false);
  });

  it('rechaza identificadores duplicados', () => {
    expect(() =>
      calculatePrizeDistribution(480000, [
        { userId: 1, points: 100 },
        { userId: 1, points: 90 },
      ]),
    ).toThrow();
  });

  it('no inventa ganadores si faltan posiciones', () => {
    const result = calculatePrizeDistribution(
      16000,
      [{ userId: 1, points: 50 }],
    );

    expect(result.winners).toHaveLength(1);
    expect(result.allocatedCOP).toBe(result.firstCOP);
    expect(result.undistributedCOP).toBe(
      result.secondCOP + result.thirdCOP,
    );
  });
});
