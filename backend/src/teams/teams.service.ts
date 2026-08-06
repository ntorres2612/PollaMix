import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) { }

  create(createTeamDto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        id: createTeamDto.id,
        name: createTeamDto.name,
        shortName: createTeamDto.shortName,
        logo: createTeamDto.logo,
        league: {
          connect: {
            id: createTeamDto.leagueId,
          },
        },
      },
    });
  }

  findAll() {
    return this.prisma.team.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  findOne(id: number) {
    return this.prisma.team.findUnique({
      where: { id },
    });
  }

update(id: number, updateTeamDto: UpdateTeamDto) {
  return this.prisma.team.update({
    where: { id },
    data: {
      ...(updateTeamDto.name && { name: updateTeamDto.name }),
      ...(updateTeamDto.shortName && {
        shortName: updateTeamDto.shortName,
      }),
      ...(updateTeamDto.logo && {
        logo: updateTeamDto.logo,
      }),
      ...(updateTeamDto.leagueId && {
        league: {
          connect: {
            id: updateTeamDto.leagueId,
          },
        },
      }),
    },
  });
}

  remove(id: number) {
    return this.prisma.team.delete({
      where: { id },
    });
  }
}