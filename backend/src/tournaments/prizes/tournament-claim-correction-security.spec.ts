import { PrizeClosureService } from './prize-closure.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Corrección oficial de reclamaciones', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),

    tournamentMatch: {
      findMany: jest.fn(),
    },

    tournament: {
      findMany: jest.fn(),
      update: jest.fn(),
    },

    tournamentPrizeClosure: {
      findMany: jest.fn(),
    },

    tournamentClaim: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },

    match: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },

    prediction: {
      findMany: jest.fn(),
      update: jest.fn(),
    },

    tournamentResultCorrection: {
      create: jest.fn(),
    },
  };

  let service: PrizeClosureService;

  const reason =
    'Resultado oficial verificado y documentado por el administrador.';

  const correct = () =>
    service.applyClaimCorrection(
      99,
      30,
      7,
      85,
      1,
      1,
      reason,
      true,
    );

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prisma) => Promise<unknown>,
      ) => callback(prisma),
    );

    // Partido 85 seleccionado en la Polla 99.
    prisma.tournamentMatch.findMany.mockResolvedValue([
      { tournamentId: 99 },
    ]);

    // Primer bloqueo: Tournament.
    // Segundo bloqueo: Match.
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 99 }])
      .mockResolvedValueOnce([{ id: 85 }]);

    prisma.tournament.findMany.mockResolvedValue([
      {
        id: 99,
        resultsPublishedAt: new Date(
          '2026-11-04T20:00:00.000Z',
        ),
      },
    ]);

    prisma.tournamentPrizeClosure.findMany
      .mockResolvedValue([]);

    prisma.tournamentClaim.findFirst.mockResolvedValue({
      id: 30,
      status: 'ACCEPTED',
      resolvedAt: null,
      resultCorrection: null,
    });

    prisma.match.findUnique.mockResolvedValue({
      homeScore: 2,
      awayScore: 1,
      finished: true,
      scoredAt: new Date(
        '2026-11-04T19:00:00.000Z',
      ),
    });

    prisma.prediction.findMany.mockResolvedValue([
      {
        id: 101,
        homeScore: 1,
        awayScore: 1,
      },
      {
        id: 102,
        homeScore: 2,
        awayScore: 0,
      },
    ]);

    prisma.match.update.mockResolvedValue({ id: 85 });
    prisma.prediction.update.mockResolvedValue({});
    prisma.tournamentClaim.update.mockResolvedValue({});
    prisma.tournament.update.mockResolvedValue({});

    prisma.tournamentResultCorrection.create
      .mockImplementation(async (args: any) => ({
        id: 50,
        ...args.data,
      }));

    service = new PrizeClosureService(
      prisma as unknown as PrismaService,
    );
  });

  it('corrige el marcador y recalcula los pronósticos', async () => {
    const result = await correct();

    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 85 },
        data: expect.objectContaining({
          homeScore: 1,
          awayScore: 1,
          finished: true,
        }),
      }),
    );

    expect(prisma.prediction.update)
      .toHaveBeenCalledTimes(2);

    expect(result.predictionsRecalculated).toBe(2);
  });

  it('registra auditoría y reinicia las 48 horas', async () => {
    const result = await correct();

    expect(
      prisma.tournamentResultCorrection.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimId: 30,
          matchId: 85,
          adminId: 7,
          oldHomeScore: 2,
          oldAwayScore: 1,
          newHomeScore: 1,
          newAwayScore: 1,
          reason,
        }),
      }),
    );

    expect(
      prisma.tournamentClaim.update,
    ).toHaveBeenCalledWith({
      where: { id: 30 },
      data: {
        resolvedAt: expect.any(Date),
      },
    });

    expect(
      prisma.tournament.update,
    ).toHaveBeenCalledWith({
      where: { id: 99 },
      data: {
        resultsRevisedAt: expect.any(Date),
      },
    });

    expect(
      result.claimsDeadlineAt.getTime()
      - result.resultsRevisedAt.getTime(),
    ).toBe(48 * 60 * 60 * 1000);
  });

  it('bloquea partidos compartidos con otra Polla publicada', async () => {
    prisma.tournamentMatch.findMany.mockResolvedValue([
      { tournamentId: 99 },
      { tournamentId: 100 },
    ]);

    prisma.$queryRaw.mockReset()
      .mockResolvedValueOnce([
        { id: 99 },
        { id: 100 },
      ])
      .mockResolvedValueOnce([{ id: 85 }]);

    prisma.tournament.findMany.mockResolvedValue([
      {
        id: 99,
        resultsPublishedAt: new Date(),
      },
      {
        id: 100,
        resultsPublishedAt: new Date(),
      },
    ]);

    await expect(correct()).rejects.toThrow(
      /otra Polla con resultados publicados/i,
    );

    expect(prisma.match.update)
      .not.toHaveBeenCalled();
  });

  it('bloquea partidos con premios cerrados', async () => {
    prisma.tournamentPrizeClosure.findMany
      .mockResolvedValue([{ tournamentId: 99 }]);

    await expect(correct()).rejects.toThrow(
      /premios definitivamente cerrados/i,
    );

    expect(prisma.match.update)
      .not.toHaveBeenCalled();
  });

  it('rechaza reclamaciones que no estén aceptadas', async () => {
    prisma.tournamentClaim.findFirst.mockResolvedValue({
      id: 30,
      status: 'PENDING',
      resolvedAt: null,
      resultCorrection: null,
    });

    await expect(correct()).rejects.toThrow(
      /no está aceptada/i,
    );

    expect(prisma.match.update)
      .not.toHaveBeenCalled();

    expect(
      prisma.tournamentResultCorrection.create,
    ).not.toHaveBeenCalled();
  });
});
