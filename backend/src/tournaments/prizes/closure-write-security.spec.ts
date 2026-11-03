import { BadRequestException } from '@nestjs/common';
import { TournamentsService } from '../tournaments.service';
import { MatchesService } from '../../matches/matches.service';

describe('Seguridad de escritura tras el cierre definitivo', () => {
  const tournamentTx = {
    $queryRaw: jest.fn(),
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },
    tournament: {
      update: jest.fn(),
    },
  };

  const tournamentPrisma = {
    tournament: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const matchTx = {
    $queryRaw: jest.fn(),
    tournamentMatch: {
      findMany: jest.fn(),
    },
    tournamentPrizeClosure: {
      findFirst: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const matchPrisma = {
    $transaction: jest.fn(),
  };

  let tournaments: TournamentsService;
  let matches: MatchesService;

  beforeEach(() => {
    jest.resetAllMocks();

    tournamentPrisma.tournament.findUnique.mockResolvedValue({
      id: 99,
      registrationStartsAt: new Date('2026-01-01'),
      registrationEndsAt: new Date('2026-01-02'),
      startsAt: new Date('2026-01-03'),
      endsAt: new Date('2026-01-31'),
    });

    tournamentPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof tournamentTx) => Promise<unknown>) =>
        fn(tournamentTx),
    );

    tournamentTx.$queryRaw.mockResolvedValue([{ id: 99 }]);
    tournamentTx.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);
    tournamentTx.tournament.update.mockResolvedValue({
      id: 99,
      active: false,
    });

    tournaments = Object.create(TournamentsService.prototype);
    (tournaments as any).prisma = tournamentPrisma;

    matchPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof matchTx) => Promise<unknown>) =>
        fn(matchTx),
    );

    matchTx.$queryRaw.mockResolvedValue([{ id: 100 }]);
    matchTx.tournamentMatch.findMany.mockResolvedValue([
      { tournamentId: 99 },
    ]);
    matchTx.match.findUnique.mockResolvedValue({ id: 100 });
    matchTx.tournamentPrizeClosure.findFirst
      .mockResolvedValue(null);
    matchTx.match.delete.mockResolvedValue({ id: 100 });

    matches = Object.create(MatchesService.prototype);
    (matches as any).prisma = matchPrisma;
  });

  it('impide editar una Polla cerrada', async () => {
    tournamentTx.tournamentPrizeClosure.findUnique
      .mockResolvedValue({ id: 1 });

    await expect(
      tournaments.update(99, {} as any),
    ).rejects.toThrow(BadRequestException);

    expect(tournamentTx.tournament.update).not.toHaveBeenCalled();
  });

  it('impide desactivar una Polla cerrada', async () => {
    tournamentTx.tournamentPrizeClosure.findUnique
      .mockResolvedValue({ id: 1 });

    await expect(
      tournaments.deactivate(99),
    ).rejects.toThrow(BadRequestException);

    expect(tournamentTx.tournament.update).not.toHaveBeenCalled();
  });

  it('permite editar una Polla sin cierre', async () => {
    await tournaments.update(99, {} as any);

    expect(tournamentTx.tournament.update)
      .toHaveBeenCalledTimes(1);
  });

  it('impide eliminar un partido de una Polla cerrada', async () => {
    matchTx.tournamentPrizeClosure.findFirst
      .mockResolvedValue({ tournamentId: 99 });

    await expect(
      matches.remove(100),
    ).rejects.toThrow(BadRequestException);

    expect(matchTx.match.delete).not.toHaveBeenCalled();
  });

  it('permite eliminar un partido sin cierres', async () => {
    await matches.remove(100);

    expect(matchTx.match.delete).toHaveBeenCalledWith({
      where: { id: 100 },
    });
  });

  it('comprueba el cierre antes de eliminar el partido', async () => {
    await matches.remove(100);

    const checkOrder =
      matchTx.tournamentPrizeClosure.findFirst
        .mock.invocationCallOrder[0];

    const deleteOrder =
      matchTx.match.delete.mock.invocationCallOrder[0];

    expect(checkOrder).toBeLessThan(deleteOrder);
  });
});
