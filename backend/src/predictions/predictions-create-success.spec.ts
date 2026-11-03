import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Creación de pronósticos - flujo válido', () => {
  const tx = {
    $queryRaw: jest.fn(),
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
    },
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentMatch: {
      findUnique: jest.fn(),
    },
    tournamentParticipant: {
      findUnique: jest.fn(),
    },
    prediction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  let service: PredictionsService;

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([{ id: 99 }]);

    tx.tournamentPrizeClosure.findUnique.mockResolvedValue(null);

    tx.match.findUnique.mockResolvedValue({
      id: 100,
      leagueId: 262,
      finished: false,
      date: new Date('2099-01-10'),
      matchday: {
        season: 2026,
      },
    });

    tx.tournament.findUnique.mockResolvedValue({
      id: 99,
      leagueId: 262,
      season: 2026,
      active: true,
      predictionsCloseAt: null,
      startsAt: new Date('2025-01-01'),
      endsAt: new Date('2099-02-01'),
    });

    tx.tournamentMatch.findUnique.mockResolvedValue({
      tournamentId: 99,
      matchId: 100,
    });

    tx.tournamentParticipant.findUnique.mockResolvedValue({
      id: 15,
      tournamentId: 99,
      userId: 5,
      paid: true,
    });

    tx.prediction.findUnique.mockResolvedValue(null);

    tx.prediction.create.mockResolvedValue({
      id: 300,
      tournamentId: 99,
      userId: 5,
      matchId: 100,
      homeScore: 2,
      awayScore: 1,
    });

    service = new PredictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('permite crear un pronóstico válido sin cierre', async () => {
    const result = await service.create(5, {
      tournamentId: 99,
      matchId: 100,
      homeScore: 2,
      awayScore: 1,
    } as any);

    expect(result).toMatchObject({
      id: 300,
      tournamentId: 99,
      userId: 5,
    });

    expect(tx.tournamentPrizeClosure.findUnique)
      .toHaveBeenCalledTimes(1);

    expect(tx.prediction.create).toHaveBeenCalledWith({
      data: {
        userId: 5,
        matchId: 100,
        tournamentId: 99,
        homeScore: 2,
        awayScore: 1,
      },
    });
  });

  it('rechaza jugadores sin pago aprobado', async () => {
    tx.tournamentParticipant.findUnique.mockResolvedValue({
      id: 15,
      tournamentId: 99,
      userId: 5,
      paid: false,
    });

    await expect(
      service.create(5, {
        tournamentId: 99,
        matchId: 100,
        homeScore: 2,
        awayScore: 1,
      } as any),
    ).rejects.toThrow();

    expect(tx.prediction.create).not.toHaveBeenCalled();
  });

  it('rechaza pronósticos duplicados', async () => {
    tx.prediction.findUnique.mockResolvedValue({ id: 200 });

    await expect(
      service.create(5, {
        tournamentId: 99,
        matchId: 100,
        homeScore: 2,
        awayScore: 1,
      } as any),
    ).rejects.toThrow();

    expect(tx.prediction.create).not.toHaveBeenCalled();
  });
});
