import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingService {

  constructor(
    private prisma: PrismaService,
  ) {}

  async getRanking() {

    const ranking =
      await this.prisma.user.findMany({

        select: {

          id: true,

          name: true,

          predictions: {

            select: {

              points: true,

            },

          },

        },

      });

    return ranking
      .map(user => ({

        id: user.id,

        name: user.name,

        points: user.predictions.reduce(
          (sum, prediction) => sum + prediction.points,
          0,
        ),

      }))
      .sort((a, b) => b.points - a.points)
      .map((user, index) => ({

        position: index + 1,

        ...user,

      }));

  }

}