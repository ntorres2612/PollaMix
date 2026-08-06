import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreatePredictionDto) {

    const match = await this.prisma.match.findUnique({
      where: {
        id: dto.matchId,
      },
    });

    if (!match) {
      throw new NotFoundException(
        'Partido no encontrado',
      );
    }

    if (match.date <= new Date()) {
      throw new BadRequestException(
        'El partido ya comenzó',
      );
    }

    const exists =
      await this.prisma.prediction.findUnique({

        where: {

          userId_matchId: {

            userId: dto.userId,

            matchId: dto.matchId,

          },

        },

      });

    if (exists) {

      throw new BadRequestException(
        'Ya existe un pronóstico para este partido.',
      );

    }

    return this.prisma.prediction.create({

      data: dto,

    });

  }

  findAll() {
    return this.prisma.prediction.findMany({
      include: {
        user: true,
        match: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.prediction.findUnique({
      where: { id },
      include: {
        user: true,
        match: true,
      },
    });
  }

  update(id: number, dto: UpdatePredictionDto) {
    return this.prisma.prediction.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.prediction.delete({
      where: { id },
    });
  }
}