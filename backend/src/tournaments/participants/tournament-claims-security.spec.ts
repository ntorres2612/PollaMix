import {
  TournamentParticipantsService,
} from './tournament-participants.service';

import { PrismaService } from '../../prisma/prisma.service';

describe('Seguridad de reclamaciones de jugadores', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),

    tournament: {
      findUniqueOrThrow: jest.fn(),
    },

    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },

    tournamentParticipant: {
      findUnique: jest.fn(),
    },

    payment: {
      findFirst: jest.fn(),
    },

    tournamentClaim: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  let service: TournamentParticipantsService;

  const validReason =
    'Solicito revisar el resultado oficial del partido seleccionado.';

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prisma) => Promise<unknown>,
      ) => callback(prisma),
    );

    prisma.$queryRaw.mockResolvedValue([{ id: 99 }]);

    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: new Date(Date.now() - 60_000),
      resultsRevisedAt: null,
    });

    prisma.tournamentPrizeClosure.findUnique
      .mockResolvedValue(null);

    prisma.tournamentParticipant.findUnique
      .mockResolvedValue({ id: 15 });

    prisma.payment.findFirst.mockResolvedValue({ id: 20 });

    prisma.tournamentClaim.findFirst.mockResolvedValue(null);

    prisma.tournamentClaim.create.mockResolvedValue({
      id: 30,
      tournamentId: 99,
      reason: validReason,
      status: 'PENDING',
      createdAt: new Date(),
    });

    service = new TournamentParticipantsService(
      prisma as unknown as PrismaService,
    );
  });

  it('rechaza reclamaciones antes de publicar resultados', async () => {
    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: null,
      resultsRevisedAt: null,
    });

    await expect(
      service.createClaim(99, 5, validReason),
    ).rejects.toThrow(/publicad/i);

    expect(prisma.tournamentClaim.create).not.toHaveBeenCalled();
  });

  it('rechaza reclamaciones fuera de las 48 horas', async () => {
    prisma.tournament.findUniqueOrThrow.mockResolvedValue({
      resultsPublishedAt: new Date(
        Date.now() - 49 * 60 * 60 * 1000,
      ),
      resultsRevisedAt: null,
    });

    await expect(
      service.createClaim(99, 5, validReason),
    ).rejects.toThrow(/terminó/i);

    expect(prisma.tournamentClaim.create).not.toHaveBeenCalled();
  });

  it('rechaza jugadores sin pago aprobado', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.createClaim(99, 5, validReason),
    ).rejects.toThrow(/pago aprobado/i);

    expect(prisma.tournamentClaim.create).not.toHaveBeenCalled();
  });

  it('rechaza una segunda reclamación pendiente', async () => {
    prisma.tournamentClaim.findFirst.mockResolvedValue({
      id: 25,
    });

    await expect(
      service.createClaim(99, 5, validReason),
    ).rejects.toThrow(/pendiente/i);

    expect(prisma.tournamentClaim.create).not.toHaveBeenCalled();
  });

  it('registra una reclamación válida como PENDING', async () => {
    const result = await service.createClaim(
      99,
      5,
      validReason,
    );

    expect(result.status).toBe('PENDING');
    expect(result.tournamentId).toBe(99);
    expect(result.claimsDeadlineAt).toBeInstanceOf(Date);

    expect(prisma.tournamentClaim.create).toHaveBeenCalledWith({
      data: {
        tournamentId: 99,
        userId: 5,
        reason: validReason,
        status: 'PENDING',
      },
      select: {
        id: true,
        tournamentId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });
  });
});
