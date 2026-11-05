import { BadRequestException } from '@nestjs/common';
import { TournamentsService } from '../tournaments.service';

describe('Seguridad del cierre - selección de partidos', () => {
  const tx = {
    $queryRaw: jest.fn(),
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },
    tournament: {
      findUnique: jest.fn(),
    },
    prediction: {
      count: jest.fn(),
    },
    tournamentParticipant: {
      count: jest.fn(),
    },
    tournamentMatch: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const prisma = {
    tournament: {
      findUnique: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: TournamentsService;
  const matchIds = Array.from({ length: 10 }, (_, i) => i + 1);

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.tournament.findUnique.mockResolvedValue({
      id: 99,
      leagueId: 262,
      season: 2026,
    });

    prisma.match.findMany.mockResolvedValue(
      matchIds.map((id) => ({
        id,
        finished: false,
        date: new Date('2099-01-01'),
      })),
    );

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([{ id: 99 }]);
    tx.tournamentPrizeClosure.findUnique.mockResolvedValue(null);
    tx.tournament.findUnique.mockResolvedValue({
      resultsPublishedAt: null,
    });
    tx.prediction.count.mockResolvedValue(0);
    tx.tournamentParticipant.count.mockResolvedValue(0);
    tx.tournamentMatch.deleteMany.mockResolvedValue({ count: 0 });
    tx.tournamentMatch.createMany.mockResolvedValue({ count: 10 });

    service = Object.create(TournamentsService.prototype);
    (service as any).prisma = prisma;

    jest.spyOn(service, 'getSelectedMatches')
      .mockResolvedValue({ success: true } as any);
  });

  it('rechaza cambiar partidos de una Polla cerrada', async () => {
    tx.tournamentPrizeClosure.findUnique.mockResolvedValue({
      id: 10,
      tournamentId: 99,
    });

    await expect(
      service.selectMatches(99, matchIds),
    ).rejects.toThrow(BadRequestException);

    expect(tx.tournamentMatch.deleteMany).not.toHaveBeenCalled();
    expect(tx.tournamentMatch.createMany).not.toHaveBeenCalled();
  });

  it('comprueba el cierre antes de borrar relaciones', async () => {
    await service.selectMatches(99, matchIds);

    const lock =
      tx.$queryRaw.mock.invocationCallOrder[0];

    const closure =
      tx.tournamentPrizeClosure.findUnique
        .mock.invocationCallOrder[0];

    const deletion =
      tx.tournamentMatch.deleteMany
        .mock.invocationCallOrder[0];

    expect(lock).toBeLessThan(closure);
    expect(closure).toBeLessThan(deletion);
  });

  it('impide cambiar partidos después de publicar resultados', async () => {
    tx.tournament.findUnique.mockResolvedValue({
      resultsPublishedAt: new Date('2026-11-04T23:06:12.262Z'),
    });

    await expect(
      service.selectMatches(99, matchIds),
    ).rejects.toThrow(
      'No se pueden cambiar los partidos después de publicar resultados.',
    );

    expect(tx.tournament.findUnique)
      .toHaveBeenCalledWith({
        where: { id: 99 },
        select: { resultsPublishedAt: true },
      });

    expect(tx.prediction.count).not.toHaveBeenCalled();
    expect(tx.tournamentParticipant.count).not.toHaveBeenCalled();

    expect(tx.tournamentMatch.deleteMany).not.toHaveBeenCalled();
    expect(tx.tournamentMatch.createMany).not.toHaveBeenCalled();
  });

  it('impide cambios cuando existen pronósticos', async () => {
    tx.prediction.count.mockResolvedValue(5);

    await expect(
      service.selectMatches(99, matchIds),
    ).rejects.toThrow(BadRequestException);

    expect(tx.tournamentMatch.deleteMany).not.toHaveBeenCalled();
  });

  it('permite cambiar partidos si no hay cierre ni pronósticos', async () => {
    await service.selectMatches(99, matchIds);

    expect(tx.tournamentMatch.deleteMany)
      .toHaveBeenCalledTimes(1);

    expect(tx.tournamentMatch.createMany)
      .toHaveBeenCalledTimes(1);
  });
});
