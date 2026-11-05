import { PrizeClosureService } from './prize-closure.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Decisiones administrativas de reclamaciones', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),

    tournament: {
      findUniqueOrThrow: jest.fn(),
    },

    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },

    tournamentClaim: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: PrizeClosureService;

  const reason =
    'Se verificó la reclamación y se documentó la decisión administrativa.';

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prisma) => Promise<unknown>,
      ) => callback(prisma),
    );

    // Primera consulta: bloqueo de Tournament.
    // Segunda consulta: bloqueo de TournamentClaim.
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 99 }])
      .mockResolvedValueOnce([{ id: 30 }]);

    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: new Date('2026-11-04T20:00:00Z'),
    });

    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);

    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({ status: 'PENDING' });

    prisma.tournamentClaim.update.mockImplementation(
      async (args: any) => ({
        id: args.where.id,
        tournamentId: 99,
        status: args.data.status,
        decision: args.data.decision,
        createdAt: new Date(),
        resolvedAt: args.data.resolvedAt,
      }),
    );

    service = new PrizeClosureService(
      prisma as unknown as PrismaService,
    );
  });

  it('rechaza una reclamación con fecha de resolución', async () => {
    const result = await service.decideClaim(
      99, 30, 'REJECTED', reason,
    );

    expect(result.status).toBe('REJECTED');
    expect(result.resolvedAt).toBeInstanceOf(Date);
    expect(result.correctionPending).toBe(false);
  });

  it('acepta una reclamación sin dar por aplicada la corrección', async () => {
    const result = await service.decideClaim(
      99, 30, 'ACCEPTED', reason,
    );

    expect(result.status).toBe('ACCEPTED');
    expect(result.resolvedAt).toBeNull();
    expect(result.correctionPending).toBe(true);
  });

  it('impide decidir nuevamente una reclamación', async () => {
    prisma.tournamentClaim.findUniqueOrThrow
      .mockResolvedValue({ status: 'REJECTED' });

    await expect(
      service.decideClaim(99, 30, 'ACCEPTED', reason),
    ).rejects.toThrow(/ya tiene una decisión/i);

    expect(prisma.tournamentClaim.update)
      .not.toHaveBeenCalled();
  });

  it('impide decisiones si los premios están cerrados', async () => {
    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue({ id: 1 });

    await expect(
      service.decideClaim(99, 30, 'REJECTED', reason),
    ).rejects.toThrow(/cerrada/i);

    expect(prisma.tournamentClaim.update)
      .not.toHaveBeenCalled();
  });

  it('impide decisiones sin publicación de resultados', async () => {
    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: null,
    });

    await expect(
      service.decideClaim(99, 30, 'REJECTED', reason),
    ).rejects.toThrow(/publicad/i);

    expect(prisma.tournamentClaim.update)
      .not.toHaveBeenCalled();
  });
});
