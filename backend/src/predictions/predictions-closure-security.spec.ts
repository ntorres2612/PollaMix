import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Protección de pronósticos después del cierre de premios', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    prediction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },
  };

  let service: PredictionsService;

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );


    prisma.prediction.findUnique.mockResolvedValue({
      id: 10,
      userId: 5,
      tournamentId: 99,
      matchId: 100,
      homeScore: 2,
      awayScore: 1,
      match: {
        id: 100,
        date: new Date('2099-01-01'),
        finished: false,
      },
      tournament: {
        id: 99,
        active: true,
        predictionsCloseAt: null,
        endsAt: new Date('2099-02-01'),
      },
    });

    prisma.tournamentPrizeClosure.findUnique.mockResolvedValue({
      id: 1,
      tournamentId: 99,
    });

    prisma.prediction.update.mockResolvedValue({
      id: 10,
      homeScore: 1,
      awayScore: 1,
    });

    prisma.prediction.delete.mockResolvedValue({
      id: 10,
    });

    service = new PredictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('impide editar un pronóstico de una Polla cerrada', async () => {
    await expect(
      service.update(10, 5, {
        homeScore: 1,
        awayScore: 1,
      } as any),
    ).rejects.toThrow(
      /cerrad|definitiv/i,
    );

    expect(prisma.prediction.update).not.toHaveBeenCalled();
  });

  it('impide eliminar un pronóstico de una Polla cerrada', async () => {
    await expect(
      service.remove(10, 5),
    ).rejects.toThrow(
      /cerrad|definitiv/i,
    );

    expect(prisma.prediction.delete).not.toHaveBeenCalled();
  });
});
