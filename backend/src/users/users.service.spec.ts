import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('consulta únicamente los campos seguros del usuario', async () => {
    const user = {
      id: 10,
      name: 'Jugador QA',
      email: 'qa@example.invalid',
      phone: null,
      role: 'PLAYER',
      rulesAcceptedAt: null,
      rulesVersion: null,
    };

    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.getMe(10)).resolves.toEqual(user);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rulesAcceptedAt: true,
        rulesVersion: true,
      },
    });
  });

  it('rechaza la consulta de un usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getMe(999))
      .rejects.toThrow(NotFoundException);
  });

  it('actualiza el teléfono utilizando campos seguros', async () => {
    const updated = {
      id: 10,
      phone: '3001234567',
    };

    prisma.user.update.mockResolvedValue(updated);

    await expect(
      service.updatePhone(10, '3001234567'),
    ).resolves.toEqual(updated);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { phone: '3001234567' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rulesAcceptedAt: true,
        rulesVersion: true,
      },
    });
  });

  it('convierte el error P2025 en usuario no encontrado', async () => {
    prisma.user.update.mockRejectedValue({
      code: 'P2025',
    });

    await expect(
      service.updatePhone(999, '3001234567'),
    ).rejects.toThrow(NotFoundException);
  });
});
