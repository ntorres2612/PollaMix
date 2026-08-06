import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {

  constructor(
    private prisma: PrismaService,
  ) {}

 async getDashboard(userId = 1) {

  const [

    users,

    matches,

    predictions,

    ranking,

    nextMatches,

    lastResults,

    myPredictions,

  ] = await Promise.all([

    this.prisma.user.count(),

    this.prisma.match.count(),

    this.prisma.prediction.count(),

    this.prisma.user.findMany({

      select: {

        id: true,

        name: true,

        predictions: {

          select: {

            points: true,

          },

        },

      },

    }),

    this.prisma.match.findMany({

      where: {

        date: {

          gt: new Date(),

        },

      },

      include: {

        homeTeam: true,

        awayTeam: true,

      },

      orderBy: {

        date: 'asc',

      },

      take: 10,

    }),

    this.prisma.match.findMany({

      where: {

        finished: true,

      },

      include: {

        homeTeam: true,

        awayTeam: true,

      },

      orderBy: {

        date: 'desc',

      },

      take: 10,

    }),

    this.prisma.prediction.findMany({

      where: {

        userId,

      },

      include: {

        match: {

          include: {

            homeTeam: true,

            awayTeam: true,

          },

        },

      },

      orderBy: {

        createdAt: 'desc',

      },

      take: 10,

    }),

  ]);

  return {

    statistics: {

      users,

      matches,

      predictions,

    },

    ranking:
      ranking
        .map(user => ({

          id: user.id,

          name: user.name,

          points:
            user.predictions.reduce(
              (sum, prediction) =>
                sum + prediction.points,
              0,
            ),

        }))
        .sort((a, b) => b.points - a.points),

    nextMatches,

    lastResults,

    myPredictions,

  };

}

}