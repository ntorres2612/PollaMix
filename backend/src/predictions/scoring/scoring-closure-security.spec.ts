import { BadRequestException } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Seguridad del cierre - recálculo de puntuaciones', () => {
  const tx = {
    $queryRaw: jest.fn(),
    tournamentMatch: {
      findMany: jest.fn(),
    },
    tournamentPrizeClosure: {
      findFirst: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    prediction: {
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  let service: ScoringService;

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([{ id: 100 }]);

    tx.tournamentMatch.findMany.mockResolvedValue([
      { tournamentId: 99 },
    ]);

    tx.tournamentPrizeClosure.findFirst.mockResolvedValue(null);

    tx.match.findUnique.mockResolvedValue({
      id: 100,
      finished: true,
      scoredAt: new Date(),
      homeScore: 2,
      awayScore: 1,
      predictions: [
        {
          id: 1,
          userId: 5,
          tournamentId: 99,
          homeScore: 2,
          awayScore: 1,
          points: 0,
        },
      ],
    });

    tx.prediction.update.mockResolvedValue({
      id: 1,
      points: 5,
    });

    tx.match.update.mockResolvedValue({
      id: 100,
      scoredAt: new Date(),
    });

    service = new ScoringService(
      prisma as unknown as PrismaService,
    );
  });

  it('permite puntuar un partido sin premios cerrados', async () => {
    const result = await service.scoreMatch(100);

    expect(result.success).toBe(true);
    expect(tx.prediction.update).toHaveBeenCalled();
    expect(tx.match.update).toHaveBeenCalled();
  });

  it('impide recalcular un partido de una Polla cerrada', async () => {
    tx.tournamentPrizeClosure.findFirst.mockResolvedValue({
      tournamentId: 99,
    });

    await expect(
      service.scoreMatch(100),
    ).rejects.toThrow(BadRequestException);

    expect(tx.prediction.update).not.toHaveBeenCalled();
    expect(tx.match.update).not.toHaveBeenCalled();
  });

  it('comprueba los cierres antes de modificar puntuaciones', async () => {
    await service.scoreMatch(100);

    expect(tx.tournamentPrizeClosure.findFirst)
      .toHaveBeenCalled();

    const closureCheck =
      tx.tournamentPrizeClosure.findFirst
        .mock.invocationCallOrder[0];

    const predictionUpdate =
      tx.prediction.update.mock.invocationCallOrder[0];

    expect(closureCheck).toBeLessThan(predictionUpdate);
  });
});
