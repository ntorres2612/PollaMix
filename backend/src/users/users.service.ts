import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeFields = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    rulesAcceptedAt: true,
    rulesVersion: true,
  } as const;

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.safeFields,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }

  async updatePhone(userId: number, phone: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { phone },
        select: this.safeFields,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      throw error;
    }
  }
}
