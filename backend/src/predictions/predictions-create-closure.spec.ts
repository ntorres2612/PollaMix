import { ForbiddenException } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Create - cierre definitivo de premios', () => {
  const calls: string[] = [];

  const tx = {
    $queryRaw: jest.fn(),
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },
    prediction: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  let service: PredictionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    calls.length = 0;

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockImplementation(async () => {
      calls.push('lock');
      return [{ id: 99 }];
    });

    tx.tournamentPrizeClosure.findUnique
      .mockImplementation(async () => {
        calls.push('closure');
        return { id: 7 };
      });

    service = new PredictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('rechaza crear pronósticos después del cierre', async () => {
    await expect(
      service.create(5, {
        tournamentId: 99,
        matchId: 100,
        homeScore: 2,
        awayScore: 1,
      } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(tx.prediction.create).not.toHaveBeenCalled();
  });

  it('bloquea el torneo antes de comprobar el cierre', async () => {
    await expect(
      service.create(5, {
        tournamentId: 99,
        matchId: 100,
        homeScore: 2,
        awayScore: 1,
      } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(calls).toEqual(['lock', 'closure']);
    expect(tx.tournamentPrizeClosure.findUnique)
      .toHaveBeenCalledWith({
        where: { tournamentId: 99 },
        select: { id: true },
      });
  });
});
