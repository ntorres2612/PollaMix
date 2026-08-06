import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchdayDto } from './dto/create-matchday.dto';
import { UpdateMatchdayDto } from './dto/update-matchday.dto';

@Injectable()
export class MatchdaysService {
  constructor(private prisma: PrismaService) { }

  create(dto: CreateMatchdayDto) {

    return this.prisma.matchday.create({

      data: {

        number: dto.number,

        tournament: dto.tournament,

        season: dto.season,

        startDate: new Date(dto.startDate),

        endDate: new Date(dto.endDate),

        active: dto.active,

        league: {
          connect: {
            id: dto.leagueId,
          },
        },

      },

    });

  }

  findAll() {
    return this.prisma.matchday.findMany({
      orderBy: {
        number: 'asc',
      },
    });
  }

  findOne(id: number) {
    return this.prisma.matchday.findUnique({
      where: { id },
    });
  }

update(id: number, dto: UpdateMatchdayDto) {

  return this.prisma.matchday.update({

    where: { id },

    data: {

      ...(dto.number !== undefined && {
        number: dto.number,
      }),

      ...(dto.tournament && {
        tournament: dto.tournament,
      }),

      ...(dto.season !== undefined && {
        season: dto.season,
      }),

      ...(dto.startDate && {
        startDate: new Date(dto.startDate),
      }),

      ...(dto.endDate && {
        endDate: new Date(dto.endDate),
      }),

      ...(dto.active !== undefined && {
        active: dto.active,
      }),

      ...(dto.leagueId !== undefined && {
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
    return this.prisma.matchday.delete({
      where: { id },
    });
  }
}