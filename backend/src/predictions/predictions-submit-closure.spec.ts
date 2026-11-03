import { ForbiddenException } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Submit - cierre definitivo de premios', () => {
  const calls: string[] = [];

  const tx = {
    $queryRaw: jest.fn(),
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
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
      calls.push('lock-tournament');
      return [{ id: 99 }];
    });

    tx.tournamentPrizeClosure.findUnique
      .mockImplementation(async () => {
        calls.push('check-closure');
        return { id: 7 };
      });

    service = new PredictionsService(
      prisma as unknown as PrismaService,
    );
  });

  const dto = {
    tournamentId: 99,
    predictions: Array.from({ length: 10 }, (_, i) => ({
      matchId: i + 1,
      selection: 'HOME' as const,
    })),
  };

  it('rechaza envíos después del cierre definitivo', async () => {
    await expect(
      service.submit(5, dto),
    ).rejects.toThrow(ForbiddenException);

    expect(tx.tournamentPrizeClosure.findUnique)
      .toHaveBeenCalledWith({
        where: { tournamentId: 99 },
        select: { id: true },
      });
  });

  it('bloquea el torneo antes de comprobar el cierre', async () => {
    await expect(
      service.submit(5, dto),
    ).rejects.toThrow(ForbiddenException);

    expect(calls).toEqual([
      'lock-tournament',
      'check-closure',
    ]);

    // No debe intentar bloquear al participante
    // después de detectar el cierre.
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
