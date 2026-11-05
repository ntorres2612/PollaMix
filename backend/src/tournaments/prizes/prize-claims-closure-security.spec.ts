import { PrizeClosureService } from './prize-closure.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Seguridad del cierre frente a reclamaciones', () => {
  const tx = {
    $queryRaw: jest.fn(),
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentMatch: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    tournamentClaim: {
      count: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  let service: PrizeClosureService;

  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 60 * 60 * 1000);

  const participants = () =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 101,
      userId: i + 1,
      paid: true,
      user: {
        id: i + 1,
        name: `Jugador QA ${i + 1}`,
        predictions: [{
          points:
            i < 3 ? 100 :
            i < 5 ? 95 :
            i === 5 ? 90 : 80,
        }],
      },
    }));

  const payments = () =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      userId: i + 1,
      participantId: i + 101,
      amount: 16000,
      currency: 'COP',
      status: 'APPROVED',
    }));

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([]);

    tx.tournamentPrizeClosure.findUnique.mockResolvedValue(null);

    tx.tournament.findUnique.mockResolvedValue({
      id: 99,
      currency: 'COP',
      inscription: 16000,
      registrationEndsAt: hoursAgo(240),
      endsAt: hoursAgo(120),
      resultsPublishedAt: hoursAgo(96),
      resultsRevisedAt: hoursAgo(72),
      participants: participants(),
    });

    tx.tournamentMatch.findMany.mockImplementation(
      async (args: { select?: { matchId?: boolean } }) => {
        if (args.select?.matchId) {
          return Array.from({ length: 10 }, (_, i) => ({
            matchId: i + 1,
          }));
        }

        return Array.from({ length: 10 }, () => ({
          match: {
            finished: true,
            scoredAt: hoursAgo(100),
            homeScore: 2,
            awayScore: 1,
          },
        }));
      },
    );

    tx.payment.findMany.mockResolvedValue(payments());
    tx.tournamentClaim.count.mockResolvedValue(0);

    service = new PrizeClosureService(
      prisma as unknown as PrismaService,
    );
  });

  it('bloquea el cierre sin publicación oficial', async () => {
    const tournament = await tx.tournament.findUnique();

    tx.tournament.findUnique.mockResolvedValue({
      ...tournament,
      resultsPublishedAt: null,
      resultsRevisedAt: null,
    });

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(/aún no han sido publicados/i);

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('reinicia el plazo de 48 horas desde la revisión', async () => {
    const tournament = await tx.tournament.findUnique();

    tx.tournament.findUnique.mockResolvedValue({
      ...tournament,
      resultsPublishedAt: hoursAgo(96),
      resultsRevisedAt: hoursAgo(1),
    });

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(/48 horas aún está abierto/i);

    expect(tx.tournamentClaim.count)
      .not.toHaveBeenCalled();

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('bloquea el cierre con reclamación PENDING', async () => {
    tx.tournamentClaim.count.mockResolvedValue(1);

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(/reclamaciones pendientes/i);

    expect(tx.tournamentClaim.count)
      .toHaveBeenCalledWith({
        where: {
          tournamentId: 99,
          OR: [
            { status: 'PENDING' },
            { status: 'ACCEPTED', resolvedAt: null },
          ],
        },
      });

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('bloquea el cierre con reclamación ACCEPTED sin resolver', async () => {
    tx.tournamentClaim.count.mockResolvedValue(1);

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(/reclamaciones pendientes/i);

    expect(tx.tournamentClaim.count)
      .toHaveBeenCalledWith({
        where: {
          tournamentId: 99,
          OR: expect.arrayContaining([
            { status: 'ACCEPTED', resolvedAt: null },
          ]),
        },
      });

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });
});
