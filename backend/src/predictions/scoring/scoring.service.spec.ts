import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ScoringService', () => {
  let service: ScoringService;

  const tx = {
    $queryRaw: jest.fn(),
    match: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    prediction: {
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([{ id: 100 }]);
    tx.match.update.mockResolvedValue({ id: 100 });
    tx.prediction.update.mockResolvedValue({});

    service = new ScoringService(
      prisma as unknown as PrismaService,
    );
  });

  it('asigna 1 punto al acierto y 0 al error', async () => {
    tx.match.findUnique.mockResolvedValue({
      id: 100,
      finished: true,
      homeScore: 2,
      awayScore: 1,
      predictions: [
        { id: 1, homeScore: 1, awayScore: 0 },
        { id: 2, homeScore: 0, awayScore: 0 },
      ],
    });

    const result = await service.scoreMatch(100);

    expect(result.scored).toBe(2);

    expect(tx.prediction.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { points: 1 },
    });

    expect(tx.prediction.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { points: 0 },
    });

    expect(tx.match.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { scoredAt: expect.any(Date) },
    });
  });

  it('rechaza un partido no finalizado', async () => {
    tx.match.findUnique.mockResolvedValue({
      id: 100,
      finished: false,
      homeScore: null,
      awayScore: null,
      predictions: [],
    });

    await expect(service.scoreMatch(100)).rejects.toThrow(
      BadRequestException,
    );

    expect(tx.prediction.update).not.toHaveBeenCalled();
    expect(tx.match.update).not.toHaveBeenCalled();
  });

  it('rechaza un partido inexistente', async () => {
    tx.match.findUnique.mockResolvedValue(null);

    await expect(service.scoreMatch(100)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('recalcula los puntos sin acumularlos', async () => {
    tx.match.findUnique.mockResolvedValue({
      id: 100,
      finished: true,
      homeScore: 1,
      awayScore: 1,
      predictions: [
        { id: 1, homeScore: 0, awayScore: 0 },
      ],
    });

    await service.scoreMatch(100);
    await service.scoreMatch(100);

    expect(tx.prediction.update).toHaveBeenCalledTimes(2);

    for (const call of tx.prediction.update.mock.calls) {
      expect(call[0]).toEqual({
        where: { id: 1 },
        data: { points: 1 },
      });
    }
  });

  it('propaga errores de actualización sin marcar el partido como puntuado', async () => {
    tx.match.findUnique.mockResolvedValue({
      id: 100,
      finished: true,
      homeScore: 2,
      awayScore: 0,
      predictions: [
        { id: 1, homeScore: 1, awayScore: 0 },
      ],
    });

    tx.prediction.update.mockRejectedValue(
      new Error('Fallo simulado de base de datos'),
    );

    await expect(service.scoreMatch(100)).rejects.toThrow(
      'Fallo simulado de base de datos',
    );

    expect(tx.match.update).not.toHaveBeenCalled();
  });
});
