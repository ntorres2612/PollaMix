import { BadRequestException } from '@nestjs/common';
import { TournamentsService } from '../tournaments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PollaMix - integración de premios', () => {
  let service: TournamentsService;

  const prisma = {
    tournamentPrizeClosure: { findUnique: jest.fn() },
    tournament: {
      findUnique: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    tournamentMatch: {
      findMany: jest.fn(),
    },
  };

  const now = Date.now();
  const past = new Date(now - 86400000);
  const future = new Date(now + 86400000);

  const tournament = {
    id: 99,
    inscription: 16000,
    currency: 'COP',
    registrationEndsAt: past,
    endsAt: past,
  };

  const payments = Array.from({ length: 30 }, (_, i) => ({
    userId: i + 1,
    amount: 16000,
  }));

  const ranking = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Jugador ${i + 1}`,
    points:
      i < 3 ? 100 :
      i < 5 ? 95 :
      i === 5 ? 90 : 80,
  }));

  const completeMatch = {
    match: {
      finished: true,
      scoredAt: new Date(),
      homeScore: 2,
      awayScore: 1,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.tournamentPrizeClosure.findUnique.mockResolvedValue(null);

    prisma.tournament.findUnique.mockResolvedValue({
      ...tournament,
    });

    prisma.payment.findMany.mockResolvedValue(
      payments.map(p => ({ ...p })),
    );

    prisma.tournamentMatch.findMany.mockResolvedValue([
      completeMatch,
    ]);

    service = new TournamentsService(
      prisma as unknown as PrismaService,
    );

    jest.spyOn(service, 'getRanking')
      .mockResolvedValue(
        ranking.map((p, i) => ({
          ...p,
          position: i + 1,
        })),
      );
  });

  it('calcula los premios de 30 pagos de $16.000', async () => {
    const result = await service.getPrizes(99);

    expect(result).toMatchObject({
      published: true,
      winnersPublished: true,
      currency: 'COP',
      registeredPaidPlayers: 30,
      revenueCOP: 480000,
      prizePoolCOP: 325488,
      profitCOP: 154512,
      prizes: {
        first: 227842,
        second: 65098,
        third: 32548,
      },
      allocatedCOP: 325488,
      undistributedCOP: 0,
    });
  });

  it('reparte premios entre empatados', async () => {
    const result = await service.getPrizes(99);

    expect(result.winners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 1,
          position: 1,
          amountCOP: 75948,
        }),
        expect.objectContaining({
          userId: 2,
          position: 1,
          amountCOP: 75947,
        }),
        expect.objectContaining({
          userId: 3,
          position: 1,
          amountCOP: 75947,
        }),
        expect.objectContaining({
          userId: 4,
          position: 2,
          amountCOP: 32549,
        }),
        expect.objectContaining({
          userId: 5,
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

    expect(result.winners).toHaveLength(6);
  });

  it('no publica ganadores con partidos pendientes', async () => {
    prisma.tournamentMatch.findMany.mockResolvedValue([
      {
        match: {
          ...completeMatch.match,
          finished: false,
          scoredAt: null,
        },
      },
    ]);

    const result = await service.getPrizes(99);

    expect(result).toMatchObject({
      winnersPublished: false,
      resultsReady: false,
      paymentsReady: true,
      winners: null,
    });
  });

  it('no publica si la inscripción sigue incompleta', async () => {
    prisma.payment.findMany.mockResolvedValue([
      ...payments.slice(0, 29),
      { userId: 30, amount: 500 },
    ]);

    const result = await service.getPrizes(99);

    expect(result).toMatchObject({
      winnersPublished: false,
      paymentsReady: false,
      winners: null,
    });
  });

  it('no publica antes de finalizar el torneo', async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      ...tournament,
      endsAt: future,
    });

    const result = await service.getPrizes(99);

    expect(result).toMatchObject({
      winnersPublished: false,
      tournamentEnded: false,
      winners: null,
    });
  });

  it('rechaza pagos aprobados duplicados', async () => {
    prisma.payment.findMany.mockResolvedValue([
      ...payments,
      { userId: 1, amount: 16000 },
    ]);

    await expect(
      service.getPrizes(99),
    ).rejects.toThrow(BadRequestException);
  });

  it('no publica ganadores sin partidos seleccionados', async () => {
    prisma.tournamentMatch.findMany.mockResolvedValue([]);

    const result = await service.getPrizes(99);

    expect(result).toMatchObject({
      winnersPublished: false,
      resultsReady: false,
      winners: null,
    });
  });

  it('mantiene ocultos los premios antes del cierre de inscripción', async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      ...tournament,
      registrationEndsAt: future,
    });

    const result = await service.getPrizes(99);

    expect(result).toMatchObject({
      published: false,
      winnersPublished: false,
      prizes: null,
      winners: null,
    });
  });
});
