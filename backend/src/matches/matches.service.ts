import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class MatchesService {

  constructor(
    private prisma: PrismaService,
  ) {}

create(dto: CreateMatchDto) {

  return this.prisma.match.create({

    data: {

      apiId: dto.apiId,

      date: new Date(dto.date),

      homeScore: dto.homeScore,

      awayScore: dto.awayScore,

      finished: dto.finished ?? false,

      league: {
        connect: {
          id: dto.leagueId,
        },
      },

      homeTeam: {
        connect: {
          id: dto.homeTeamId,
        },
      },

      awayTeam: {
        connect: {
          id: dto.awayTeamId,
        },
      },

      matchday: {
        connect: {
          id: dto.matchdayId,
        },
      },

    },

  });

}

  findAll() {

    return this.prisma.match.findMany({

      include: {

        homeTeam: true,

        awayTeam: true,

        matchday: true,

      },

      orderBy: {

        date: 'asc',

      },

    });

  }

  findOne(id: number) {

    return this.prisma.match.findUnique({

      where: { id },

      include: {

        homeTeam: true,

        awayTeam: true,

        matchday: true,

      },

    });

  }

 update(id: number, dto: UpdateMatchDto) {

  return this.prisma.match.update({

    where: { id },

    data: {

      ...(dto.date && {
        date: new Date(dto.date),
      }),

      ...(dto.homeScore !== undefined && {
        homeScore: dto.homeScore,
      }),

      ...(dto.awayScore !== undefined && {
        awayScore: dto.awayScore,
      }),

      ...(dto.finished !== undefined && {
        finished: dto.finished,
      }),

      ...(dto.homeTeamId && {
        homeTeam: {
          connect: {
            id: dto.homeTeamId,
          },
        },
      }),

      ...(dto.awayTeamId && {
        awayTeam: {
          connect: {
            id: dto.awayTeamId,
          },
        },
      }),

      ...(dto.matchdayId && {
        matchday: {
          connect: {
            id: dto.matchdayId,
          },
        },
      }),

      ...(dto.leagueId && {
        league: {
          connect: {
            id: dto.leagueId,
          },
        },
      }),

    },

  });

}

  remove(id: number) {

    return this.prisma.match.delete({

      where: { id },

    });

  }

}