import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  assertMatchNotPrizeClosed,
} from './match-prize-closure.guard';

describe('Protección de partidos con premios cerrados', () => {
  const tx = {
    match: {
      findUnique: jest.fn(),
    },
    tournamentPrizeClosure: {
      findFirst: jest.fn(),
    },
    tournament: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();

    tx.match.findUnique.mockResolvedValue({
      id: 100,
    });

    tx.tournamentPrizeClosure.findFirst
      .mockResolvedValue(null);

    tx.tournament.findFirst
      .mockResolvedValue(null);
  });

  const client = () =>
    tx as unknown as Prisma.TransactionClient;

  it('permite un partido sin cierres', async () => {
    await expect(
      assertMatchNotPrizeClosed(client(), 100),
    ).resolves.toBeUndefined();

    expect(
      tx.tournamentPrizeClosure.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        tournament: {
          tournamentMatches: {
            some: {
              matchId: 100,
            },
          },
        },
      },
      select: {
        tournamentId: true,
      },
    });
  });

  it('bloquea un partido asociado a una Polla cerrada', async () => {
    tx.tournamentPrizeClosure.findFirst
      .mockResolvedValue({
        tournamentId: 8,
      });

    await expect(
      assertMatchNotPrizeClosed(client(), 100),
    ).rejects.toThrow(BadRequestException);
  });

  it('bloquea un partido con resultados publicados', async () => {
    tx.tournament.findFirst.mockResolvedValue({
      id: 9,
    });

    await expect(
      assertMatchNotPrizeClosed(client(), 100),
    ).rejects.toThrow(
      'No se permite modificar un partido asociado a resultados ya publicados.',
    );

    expect(
      tx.tournament.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        resultsPublishedAt: { not: null },
        tournamentMatches: {
          some: { matchId: 100 },
        },
      },
      select: { id: true },
    });
  });

  it('rechaza partidos inexistentes', async () => {
    tx.match.findUnique.mockResolvedValue(null);

    await expect(
      assertMatchNotPrizeClosed(client(), 999),
    ).rejects.toThrow(NotFoundException);

    expect(
      tx.tournamentPrizeClosure.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('rechaza identificadores inválidos', async () => {
    await expect(
      assertMatchNotPrizeClosed(client(), 0),
    ).rejects.toThrow(BadRequestException);

    expect(tx.match.findUnique)
      .not.toHaveBeenCalled();
  });
});
