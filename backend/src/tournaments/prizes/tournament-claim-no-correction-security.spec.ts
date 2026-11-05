import { PrizeClosureService } from './prize-closure.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Resolución de reclamaciones sin corrección', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),

    tournament: {
      findUniqueOrThrow: jest.fn(),
    },

    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },

    user: {
      findUnique: jest.fn(),
    },

    tournamentClaim: {
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },

    tournamentClaimNoCorrectionResolution: {
      create: jest.fn(),
    },
  };

  const reason =
    'Se verificó la reclamación y no es necesario modificar el marcador oficial.';

  let service: PrizeClosureService;

  const resolve = () =>
    service.resolveClaimWithoutCorrection(
      99,
      30,
      7,
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

    // Primer bloqueo: Tournament.
    // Segundo bloqueo: TournamentClaim.
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 99 }])
      .mockResolvedValueOnce([{ id: 30 }]);

    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: new Date(
        '2026-11-04T20:00:00.000Z',
      ),
    });

    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);

    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'ADMIN',
    });

    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({
        status: 'ACCEPTED',
        resolvedAt: null,
        resultCorrection: null,
        noCorrectionResolution: null,
      });

    prisma.tournamentClaim.updateMany.mockResolvedValue({
      count: 1,
    });

    prisma.tournamentClaimNoCorrectionResolution.create
      .mockImplementation(async (args: any) => ({
        id: 51,
        ...args.data,
      }));

    service = new PrizeClosureService(
      prisma as unknown as PrismaService,
    );
  });

  it('resuelve la reclamación aceptada con auditoría', async () => {
    const result = await resolve();

    expect(result.status).toBe('ACCEPTED');
    expect(result.resolutionType).toBe('WITHOUT_CORRECTION');
    expect(result.resolvedAt).toBeInstanceOf(Date);

    expect(prisma.tournamentClaim.updateMany)
      .toHaveBeenCalledWith({
        where: {
          id: 30,
          tournamentId: 99,
          status: 'ACCEPTED',
          resolvedAt: null,
        },
        data: {
          resolvedAt: expect.any(Date),
        },
      });

    expect(
      prisma.tournamentClaimNoCorrectionResolution.create,
    ).toHaveBeenCalledWith({
      data: {
        claimId: 30,
        adminId: 7,
        reason,
        resolvedAt: result.resolvedAt,
      },
      select: {
        id: true,
        claimId: true,
        adminId: true,
        reason: true,
        resolvedAt: true,
      },
    });
  });

  it('usa transacción serializable', async () => {
    await resolve();

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: 'Serializable',
      }),
    );
  });

  it('rechaza un administrador sin rol ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'PLAYER',
    });

    await expect(resolve()).rejects.toThrow(
      /administrador no es válido/i,
    );

    expect(prisma.tournamentClaim.updateMany)
      .not.toHaveBeenCalled();
  });

  it('rechaza reclamaciones pendientes', async () => {
    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({
        status: 'PENDING',
        resolvedAt: null,
        resultCorrection: null,
        noCorrectionResolution: null,
      });

    await expect(resolve()).rejects.toThrow(
      /no está aceptada/i,
    );

    expect(prisma.tournamentClaim.updateMany)
      .not.toHaveBeenCalled();
  });

  it('rechaza reclamaciones ya resueltas', async () => {
    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({
        status: 'ACCEPTED',
        resolvedAt: new Date(),
        resultCorrection: null,
        noCorrectionResolution: null,
      });

    await expect(resolve()).rejects.toThrow(
      /pendiente de resolución/i,
    );
  });

  it('rechaza reclamaciones con corrección oficial', async () => {
    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({
        status: 'ACCEPTED',
        resolvedAt: null,
        resultCorrection: { id: 10 },
        noCorrectionResolution: null,
      });

    await expect(resolve()).rejects.toThrow(
      /pendiente de resolución/i,
    );
  });

  it('rechaza reclamaciones con auditoría anterior', async () => {
    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({
        status: 'ACCEPTED',
        resolvedAt: null,
        resultCorrection: null,
        noCorrectionResolution: { id: 51 },
      });

    await expect(resolve()).rejects.toThrow(
      /pendiente de resolución/i,
    );
  });

  it('impide actuar después del cierre de premios', async () => {
    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue({ id: 12 });

    await expect(resolve()).rejects.toThrow(
      /premios definitivamente cerrados/i,
    );

    expect(prisma.tournamentClaim.updateMany)
      .not.toHaveBeenCalled();
  });

  it('impide resolver resultados no publicados', async () => {
    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: null,
    });

    await expect(resolve()).rejects.toThrow(
      /todavía no están publicados/i,
    );

    expect(prisma.tournamentClaim.updateMany)
      .not.toHaveBeenCalled();
  });

  it('impide resolver reclamaciones de otra Polla', async () => {
    prisma.$queryRaw.mockReset()
      .mockResolvedValueOnce([{ id: 99 }])
      .mockResolvedValueOnce([]);

    await expect(resolve()).rejects.toThrow(
      /no existe en esta Polla/i,
    );

    expect(prisma.tournamentClaim.updateMany)
      .not.toHaveBeenCalled();
  });

  it('rechaza confirmación administrativa ausente', async () => {
    await expect(
      service.resolveClaimWithoutCorrection(
        99, 30, 7, reason, false,
      ),
    ).rejects.toThrow(/debes confirmar/i);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza justificaciones demasiado cortas', async () => {
    await expect(
      service.resolveClaimWithoutCorrection(
        99, 30, 7, 'Sin cambios', true,
      ),
    ).rejects.toThrow(/entre 20 y 2000 caracteres/i);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza identificadores inválidos', async () => {
    await expect(
      service.resolveClaimWithoutCorrection(
        99, -1, 7, reason, true,
      ),
    ).rejects.toThrow(/identificadores no son válidos/i);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('impide continuar si el estado cambia', async () => {
    prisma.tournamentClaim.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(resolve()).rejects.toThrow(
      /cambió de estado/i,
    );

    expect(
      prisma.tournamentClaimNoCorrectionResolution.create,
    ).not.toHaveBeenCalled();
  });

  it('no realiza cambios sobre partidos ni pronósticos', async () => {
    await resolve();

    // El servicio recibe exclusivamente estos mocks.
    // No dispone de operaciones de escritura sobre Match
    // ni sobre Prediction durante esta prueba.
    expect(
      prisma.tournamentClaimNoCorrectionResolution.create,
    ).toHaveBeenCalledTimes(1);
    expect(prisma.tournamentClaim.updateMany)
      .toHaveBeenCalledTimes(1);
  });
});
