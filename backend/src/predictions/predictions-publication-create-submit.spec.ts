import { ForbiddenException } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Protección de creación y confirmación tras publicación', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),

    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },

    tournament: {
      findUnique: jest.fn(),
    },

    prediction: {
      create: jest.fn(),
      createMany: jest.fn(),
    },

    tournamentParticipant: {
      update: jest.fn(),
    },
  };

  let service: PredictionsService;

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prisma) => Promise<unknown>,
      ) => callback(prisma),
    );

    prisma.$queryRaw.mockResolvedValue([{ id: 99 }]);

    // No existe cierre definitivo de premios.
    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);

    // La clasificación provisional ya está publicada.
    prisma.tournament.findUnique.mockResolvedValue({
      id: 99,
      resultsPublishedAt: new Date(
        '2026-11-04T20:00:00.000Z',
      ),
    });

    service = new PredictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('bloquea el envío conjunto de 10 pronósticos', async () => {
    const predictions = Array.from(
      { length: 10 },
      (_, index) => ({
        matchId: index + 101,
        selection: 'HOME',
      }),
    );

    await expect(
      service.submit(
        5,
        {
          tournamentId: 99,
          predictions,
        } as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prisma.prediction.createMany,
    ).not.toHaveBeenCalled();

    expect(
      prisma.tournamentParticipant.update,
    ).not.toHaveBeenCalled();
  });

  it('bloquea la creación de un pronóstico individual', async () => {
    await expect(
      service.create(
        5,
        {
          tournamentId: 99,
          matchId: 101,
          homeScore: 1,
          awayScore: 0,
        } as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prisma.prediction.create,
    ).not.toHaveBeenCalled();
  });

  it('comprueba publicación después del bloqueo del torneo', async () => {
    await expect(
      service.create(
        5,
        {
          tournamentId: 99,
          matchId: 101,
          homeScore: 1,
          awayScore: 0,
        } as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    const lockOrder =
      prisma.$queryRaw.mock.invocationCallOrder[0];

    const publicationOrder =
      prisma.tournament.findUnique
        .mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(publicationOrder);
  });
});
