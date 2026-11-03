import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService - protección del cierre', () => {
  const tx = {
    $queryRaw: jest.fn(),
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tournamentPrizeClosure: {
      findUnique: jest.fn(),
    },
    tournamentParticipant: {
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  let service: PaymentsService;

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([{ id: 99 }]);

    tx.payment.findUnique.mockResolvedValue({
      id: 10,
      tournamentId: 99,
      participantId: 101,
      status: 'PENDING',
    });

    tx.tournamentPrizeClosure.findUnique.mockResolvedValue(null);

    tx.payment.update.mockResolvedValue({
      id: 10,
      tournamentId: 99,
      status: 'APPROVED',
    });

    tx.tournamentParticipant.update.mockResolvedValue({
      id: 101,
      paid: true,
    });

    service = new PaymentsService(
      prisma as unknown as PrismaService,
    );
  });

  it('bloquea la modificación si existe cierre', async () => {
    tx.tournamentPrizeClosure.findUnique.mockResolvedValue({
      id: 5,
    });

    await expect(
      service.updateStatus(10, { status: 'APPROVED' }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.tournamentParticipant.update).not.toHaveBeenCalled();
  });

  it('permite aprobar un pago sin cierre', async () => {
    const result = await service.updateStatus(
      10,
      { status: 'APPROVED' },
    );

    expect(result.status).toBe('APPROVED');
    expect(tx.payment.update).toHaveBeenCalledTimes(1);
    expect(tx.tournamentParticipant.update)
      .toHaveBeenCalledTimes(1);
  });

  it('comprueba el cierre antes de actualizar', async () => {
    await service.updateStatus(
      10,
      { status: 'APPROVED' },
    );

    const lockOrder =
      tx.$queryRaw.mock.invocationCallOrder[0];

    const closureOrder =
      tx.tournamentPrizeClosure.findUnique
        .mock.invocationCallOrder[0];

    const paymentUpdateOrder =
      tx.payment.update.mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(closureOrder);
    expect(closureOrder).toBeLessThan(paymentUpdateOrder);
  });

  it('rechaza cambios de un pago aprobado', async () => {
    tx.payment.findUnique.mockResolvedValue({
      id: 10,
      tournamentId: 99,
      participantId: 101,
      status: 'APPROVED',
    });

    await expect(
      service.updateStatus(10, { status: 'REJECTED' }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.payment.update).not.toHaveBeenCalled();
  });
});
