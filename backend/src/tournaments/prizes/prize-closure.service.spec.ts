import { BadRequestException } from '@nestjs/common';
import { PrizeClosureService } from './prize-closure.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PrizeClosureService - cierre definitivo', () => {
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

  const createParticipants = () =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 101,
      userId: i + 1,
      paid: true,
      user: {
        id: i + 1,
        name: `Jugador ${i + 1}`,
        predictions: [{
          points:
            i < 3 ? 100 :
            i < 5 ? 95 :
            i === 5 ? 90 : 80,
        }],
      },
    }));

  const createPayments = () =>
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

    tx.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);

    tx.tournament.findUnique.mockResolvedValue({
      id: 99,
      currency: 'COP',
      inscription: 16000,
      registrationEndsAt: new Date('2025-01-01'),
      endsAt: new Date('2025-02-01'),
      resultsPublishedAt: new Date('2025-02-02'),
      resultsRevisedAt: new Date('2025-02-03'),
      participants: createParticipants(),
    });

    tx.tournamentMatch.findMany
      .mockImplementation(async (args: {
        select?: { matchId?: boolean };
      }) => {
        if (args.select?.matchId) {
          return Array.from({ length: 10 }, (_, i) => ({
            matchId: i + 1,
          }));
        }

        return Array.from({ length: 10 }, () => ({
          match: {
            finished: true,
            scoredAt: new Date(),
            homeScore: 2,
            awayScore: 1,
          },
        }));
      });

    tx.payment.findMany.mockResolvedValue(
      createPayments(),
    );

    tx.tournamentClaim.count.mockResolvedValue(0);

    tx.tournamentPrizeClosure.create
      .mockImplementation(async ({ data }: { data: unknown }) => ({
        id: 1,
        ...data as object,
      }));

    service = new PrizeClosureService(
      prisma as unknown as PrismaService,
    );
  });

  it('guarda los premios de 30 jugadores con empates', async () => {
    const result = await service.closeTournament(99);

    expect(result).toMatchObject({
      tournamentId: 99,
      currency: 'COP',
      paidPlayers: 30,
      revenueCOP: 480000,
      prizePoolCOP: 325488,
      profitCOP: 154512,
      firstCOP: 227842,
      secondCOP: 65098,
      thirdCOP: 32548,
      allocatedCOP: 325488,
      undistributedCOP: 0,
    });

    expect(result.winners).toHaveLength(6);

    expect(result.winners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 1,
          position: 1,
          amountCOP: 75948,
        }),
        expect.objectContaining({
          userId: 4,
          position: 2,
          amountCOP: 32549,
        }),
        expect.objectContaining({
          userId: 6,
          position: 3,
          amountCOP: 32548,
        }),
      ]),
    );

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
      .toHaveBeenCalledTimes(1);
  });

  it('rechaza un segundo cierre', async () => {
    tx.tournamentPrizeClosure.findUnique
      .mockResolvedValue({ id: 1, tournamentId: 99 });

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(BadRequestException);

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('bloquea pagos pendientes', async () => {
    tx.payment.findMany.mockResolvedValue([
      ...createPayments(),
      {
        id: 31,
        userId: 31,
        participantId: 131,
        amount: 16000,
        currency: 'COP',
        status: 'PENDING',
      },
    ]);

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(
      'Existen pagos pendientes de conciliación.',
    );

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('bloquea pagos de importe incorrecto', async () => {
    const payments = createPayments();
    payments[0].amount = 500;

    tx.payment.findMany.mockResolvedValue(payments);

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(BadRequestException);

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('bloquea partidos pendientes', async () => {
    tx.tournamentMatch.findMany.mockImplementation(
      async (args: {
        select?: { matchId?: boolean };
      }) => {
        if (args.select?.matchId) {
          return Array.from({ length: 10 }, (_, i) => ({
            matchId: i + 1,
          }));
        }

        return Array.from({ length: 10 }, (_, i) => ({
          match: {
            finished: i !== 0,
            scoredAt: i === 0 ? null : new Date(),
            homeScore: 2,
            awayScore: 1,
          },
        }));
      },
    );

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(BadRequestException);

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('bloquea torneos que aún no han terminado', async () => {
    tx.tournament.findUnique.mockResolvedValue({
      id: 99,
      currency: 'COP',
      inscription: 16000,
      registrationEndsAt: new Date('2025-01-01'),
      endsAt: new Date('2099-01-01'),
      participants: createParticipants(),
    });

    await expect(
      service.closeTournament(99),
    ).rejects.toThrow(BadRequestException);

    expect(tx.tournamentPrizeClosure.create)
      .not.toHaveBeenCalled();
  });

  it('rechaza un identificador inválido', async () => {
    await expect(
      service.closeTournament(0),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
