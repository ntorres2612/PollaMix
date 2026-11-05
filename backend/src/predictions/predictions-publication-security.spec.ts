import { ForbiddenException } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Protección de pronósticos publicados', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),

    prediction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },

    tournament: {
      findUnique: jest.fn(),
    },

    tournamentPrizeClosure: {
      findUnique: jest.fn(),
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

    // Los premios todavía NO están cerrados.
    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);

    // Pero los resultados SÍ fueron publicados.
    prisma.tournament.findUnique.mockResolvedValue({
      resultsPublishedAt: new Date(
        '2026-11-04T20:00:00.000Z',
      ),
    });

    service = new PredictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('impide editar después de publicar resultados', async () => {
    await expect(
      service.update(
        10,
        5,
        {
          homeScore: 1,
          awayScore: 1,
        } as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prisma.tournament.findUnique,
    ).toHaveBeenCalledWith({
      where: { id: 99 },
      select: { resultsPublishedAt: true },
    });

    expect(
      prisma.prediction.update,
    ).not.toHaveBeenCalled();
  });

  it('impide eliminar después de publicar resultados', async () => {
    await expect(
      service.remove(10, 5),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prisma.tournament.findUnique,
    ).toHaveBeenCalledWith({
      where: { id: 99 },
      select: { resultsPublishedAt: true },
    });

    expect(
      prisma.prediction.delete,
    ).not.toHaveBeenCalled();
  });

  it('comprueba el estado publicado después del bloqueo', async () => {
    await expect(
      service.remove(10, 5),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.tournament.findUnique).toHaveBeenCalled();

    const lockOrder =
      prisma.$queryRaw.mock.invocationCallOrder[0];

    const publicationOrder =
      prisma.tournament.findUnique
        .mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(publicationOrder);
  });
});
