import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {

  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async getDashboard(userId: number) {

    const [
      users,
      matches,
      predictions,
      ranking,
      nextMatches,
      lastResults,
      myPredictions,
      myTournaments,
    ] = await Promise.all([

      // Estadística general
      this.prisma.user.count(),

      this.prisma.match.count(),

      this.prisma.prediction.count(),

      // Ranking general
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

      // Próximos partidos
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

      // Últimos resultados
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

      // Mis pronósticos
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
          tournament: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),

      // Mis Pollas
      this.prisma.tournamentParticipant.findMany({
        where: {
          userId,
        },
        include: {
          tournament: {
            include: {
              league: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      }),

    ]);

    // Construir ranking
    const calculatedRanking = ranking
      .map(user => ({
        id: user.id,
        name: user.name,
        points: user.predictions.reduce(
          (sum, prediction) =>
            sum + prediction.points,
          0,
        ),
      }))
      .sort((a, b) => b.points - a.points)
      .map((user, index) => ({
        position: index + 1,
        ...user,
      }));

    // Buscar posición del usuario actual
    const myRanking = calculatedRanking.find(
      user => user.id === userId,
    );

    // Pollas activas del usuario
    const activeTournaments = myTournaments.filter(
      participant =>
        participant.tournament.active,
    );

    // Total de puntos del usuario
    const totalPoints =
      myRanking?.points ?? 0;

    return {

      user: {
        id: userId,
      },

      statistics: {
        users,
        matches,
        predictions,

        myPredictions:
          myPredictions.length,

        myTournaments:
          myTournaments.length,

        activeTournaments:
          activeTournaments.length,

        points:
          totalPoints,
      },

      ranking: {
        position:
          myRanking?.position ?? null,

        points:
          totalPoints,

        users:
          calculatedRanking,
      },

      myTournaments,

      nextMatches,

      lastResults,

      myPredictions,

    };
  }
}