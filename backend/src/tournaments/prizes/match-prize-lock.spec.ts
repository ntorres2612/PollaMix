import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  lockMatchForPrizeSafeUpdate,
} from './match-prize-lock';

describe('Bloqueo transaccional de resultados', () => {
  const calls: string[] = [];

  const tx = {
    tournamentMatch: {
      findMany: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
    },
    tournamentPrizeClosure: {
      findFirst: jest.fn(),
    },
    tournament: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    calls.length = 0;

    tx.tournamentMatch.findMany.mockImplementation(async () => {
      calls.push('relations');

      return [
        { tournamentId: 5 },
        { tournamentId: 2 },
      ];
    });

    tx.$queryRaw.mockImplementation(async () => {
      calls.push('lock');
      return [];
    });

    tx.match.findUnique.mockImplementation(async () => {
      calls.push('match-check');
      return { id: 100 };
    });

    tx.tournamentPrizeClosure.findFirst
      .mockImplementation(async () => {
        calls.push('closure-check');
        return null;
      });

    tx.tournament.findFirst.mockImplementation(async () => {
      calls.push('publication-check');
      return null;
    });
  });

  const client = () =>
    tx as unknown as Prisma.TransactionClient;

  it('bloquea antes de comprobar el cierre', async () => {
    await lockMatchForPrizeSafeUpdate(client(), 100);

    expect(calls).toEqual([
      'relations',
      'lock',
      'lock',
      'relations',
      'match-check',
      'closure-check',
      'publication-check',
    ]);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('permite un partido sin torneos asociados', async () => {
    tx.tournamentMatch.findMany.mockResolvedValue([]);

    await expect(
      lockMatchForPrizeSafeUpdate(client(), 100),
    ).resolves.toBeUndefined();

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('rechaza un partido con premios cerrados', async () => {
    tx.tournamentPrizeClosure.findFirst.mockResolvedValue({
      tournamentId: 5,
    });

    await expect(
      lockMatchForPrizeSafeUpdate(client(), 100),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza un partido con resultados publicados', async () => {
    tx.tournament.findFirst.mockResolvedValue({
      id: 5,
    });

    await expect(
      lockMatchForPrizeSafeUpdate(client(), 100),
    ).rejects.toThrow(
      'No se permite modificar un partido asociado a resultados ya publicados.',
    );

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);

    expect(tx.tournament.findFirst)
      .toHaveBeenCalledWith({
        where: {
          resultsPublishedAt: { not: null },
          tournamentMatches: {
            some: { matchId: 100 },
          },
        },
        select: { id: true },
      });
  });

  it('rechaza un partido inexistente', async () => {
    tx.match.findUnique.mockResolvedValue(null);

    await expect(
      lockMatchForPrizeSafeUpdate(client(), 100),
    ).rejects.toThrow(NotFoundException);
  });

  it('detecta cambios en torneos asociados', async () => {
    tx.tournamentMatch.findMany
      .mockResolvedValueOnce([{ tournamentId: 2 }])
      .mockResolvedValueOnce([
        { tournamentId: 2 },
        { tournamentId: 5 },
      ]);

    await expect(
      lockMatchForPrizeSafeUpdate(client(), 100),
    ).rejects.toThrow('Cambió la selección');
  });

  it('rechaza identificadores inválidos', async () => {
    await expect(
      lockMatchForPrizeSafeUpdate(client(), -1),
    ).rejects.toThrow(BadRequestException);

    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
