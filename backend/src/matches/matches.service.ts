import { Injectable, BadRequestException } from '@nestjs/common';
import { ScoringService } from '../predictions/scoring/scoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class MatchesService {

  constructor(
    private prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) { }

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

  async update(id: number, dto: UpdateMatchDto) {
    return this.prisma.$transaction(
      async (tx) => {
        // Serializa actualizaciones simultáneas del mismo partido.
        await tx.$queryRaw`
          SELECT id FROM "Match"
          WHERE id = ${id}
          FOR UPDATE
        `;

        const current = await tx.match.findUnique({
          where: { id },
        });

        if (!current) {
          throw new BadRequestException('Partido no encontrado.');
        }

        const homeScore = dto.homeScore ?? current.homeScore;
        const awayScore = dto.awayScore ?? current.awayScore;
        const finished = dto.finished ?? current.finished;

        if (
          finished &&
          (
            homeScore === null ||
            awayScore === null ||
            homeScore < 0 ||
            awayScore < 0
          )
        ) {
          throw new BadRequestException(
            'Un partido finalizado necesita un marcador válido.',
          );
        }

        const updated = await tx.match.update({
          where: { id },
          data: {
            ...(dto.date !== undefined && {
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
            ...(dto.homeTeamId !== undefined && {
              homeTeam: { connect: { id: dto.homeTeamId } },
            }),
            ...(dto.awayTeamId !== undefined && {
              awayTeam: { connect: { id: dto.awayTeamId } },
            }),
            ...(dto.matchdayId !== undefined && {
              matchday: { connect: { id: dto.matchdayId } },
            }),
            ...(dto.leagueId !== undefined && {
              league: { connect: { id: dto.leagueId } },
            }),
          },
        });

        if (finished) {
          await this.scoringService.scoreMatchInTransaction(
            tx,
            id,
          );
        } else if (current.scoredAt !== null) {
          // Evita mantener puntos de un resultado invalidado.
          await tx.prediction.updateMany({
            where: { matchId: id },
            data: { points: 0 },
          });

          await tx.match.update({
            where: { id },
            data: { scoredAt: null },
          });
        }

        return updated;
      },
      { timeout: 20000 },
    );
  }

  async findByMatchday(matchdayId: number) {
    return this.prisma.match.findMany({
      where: {
        matchdayId,
      },
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

  remove(id: number) {

    return this.prisma.match.delete({

      where: { id },

    });

  }

}