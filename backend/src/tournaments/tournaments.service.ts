import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentsService {

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async create(dto: CreateTournamentDto) {

        const league =
            await this.prisma.league.findUnique({
                where: {
                    id: dto.leagueId,
                },
            });

        if (!league) {

            throw new NotFoundException(
                'La liga no existe.',
            );

        }

        const startsAt =
            new Date(dto.startsAt);

        const endsAt =
            new Date(dto.endsAt);

        if (endsAt <= startsAt) {

            throw new BadRequestException(
                'La fecha de finalización debe ser posterior a la fecha de inicio.',
            );

        }

        if (dto.prize < 0) {

            throw new BadRequestException(
                'El premio no puede ser negativo.',
            );

        }

        return this.prisma.tournament.create({

            data: {

                name: dto.name,

                description: dto.description,

                leagueId: dto.leagueId,

                season: dto.season,

                inscription: dto.inscription,

                prize: dto.prize,

                maxPlayers: dto.maxPlayers,

                startsAt,

                endsAt,

            },

            include: {

                league: true,

            },

        });

    }
    async join(
        tournamentId: number,
        userId: number,
    ) {

        const tournament =
            await this.prisma.tournament.findUnique({

                where: {
                    id: tournamentId,
                },

                include: {
                    participants: true,
                },

            });

        if (!tournament) {

            throw new NotFoundException(
                'La Polla no existe.',
            );

        }

        if (!tournament.active) {

            throw new BadRequestException(
                'La Polla no está activa.',
            );

        }

        const now = new Date();

        if (now < tournament.startsAt) {

            throw new BadRequestException(
                'La inscripción todavía no está abierta.',
            );

        }

        if (now > tournament.endsAt) {

            throw new BadRequestException(
                'El período de inscripción ya terminó.',
            );

        }

        const user =
            await this.prisma.user.findUnique({

                where: {
                    id: userId,
                },

            });

        if (!user) {

            throw new NotFoundException(
                'El usuario no existe.',
            );

        }

        const alreadyJoined =
            await this.prisma.tournamentParticipant.findUnique({

                where: {

                    tournamentId_userId: {

                        tournamentId,

                        userId,

                    },

                },

            });

        if (alreadyJoined) {

            throw new BadRequestException(
                'El usuario ya está inscrito en esta Polla.',
            );

        }

        if (
            tournament.participants.length >=
            tournament.maxPlayers
        ) {

            throw new BadRequestException(
                'La Polla ya alcanzó el máximo de participantes.',
            );

        }

        return this.prisma.tournamentParticipant.create({

            data: {

                tournamentId,

                userId,

                paid: tournament.inscription === 0,

            },

            include: {

                tournament: true,

                user: {

                    select: {

                        id: true,

                        name: true,

                        email: true,

                    },

                },

            },

        });

    }

    async getMatches(tournamentId: number) {

        const tournament =
            await this.prisma.tournament.findUnique({

                where: {
                    id: tournamentId,
                },

            });

        if (!tournament) {

            throw new NotFoundException(
                'La Polla no existe.',
            );

        }

        return this.prisma.match.findMany({

            where: {

                leagueId: tournament.leagueId,

                matchday: {
                    season: tournament.season,
                },

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
    async getRanking(tournamentId: number) {

        const tournament =
            await this.prisma.tournament.findUnique({

                where: {
                    id: tournamentId,
                },

                include: {
                    participants: {
                        include: {
                            user: {
                                include: {
                                    predictions: {
                                        select: {
                                            points: true,
                                            match: {
                                                select: {
                                                    leagueId: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

            });

        if (!tournament) {

            throw new NotFoundException(
                'La Polla no existe.',
            );

        }

        const ranking =
            tournament.participants.map(
                participant => {

                    const points =
                        participant.user.predictions
                            .filter(
                                prediction =>
                                    prediction.match.leagueId ===
                                    tournament.leagueId,
                            )
                            .reduce(
                                (sum, prediction) =>
                                    sum + prediction.points,
                                0,
                            );

                    return {

                        id: participant.user.id,

                        name: participant.user.name,

                        points,

                    };

                },
            );

        return ranking
            .sort(
                (a, b) =>
                    b.points - a.points,
            )
            .map(
                (user, index) => ({

                    position: index + 1,

                    ...user,

                }),
            );

    }

    async findAll() {
        return this.prisma.tournament.findMany({
            include: {
                league: true,
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                startsAt: 'asc',
            },
        });
    }

    async findOne(id: number) {
        const tournament =
            await this.prisma.tournament.findUnique({
                where: {
                    id,
                },
                include: {
                    league: true,
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });

        if (!tournament) {
            throw new NotFoundException(
                'Torneo no encontrado',
            );
        }

        return tournament;
    }

    async update(id: number, dto: any) {
        const tournament =
            await this.prisma.tournament.findUnique({
                where: {
                    id,
                },
            });

        if (!tournament) {
            throw new NotFoundException(
                'Torneo no encontrado',
            );
        }

        return this.prisma.tournament.update({
            where: {
                id,
            },
            data: dto,
        });
    }

    async deactivate(id: number) {
        const tournament =
            await this.prisma.tournament.findUnique({
                where: {
                    id,
                },
            });

        if (!tournament) {
            throw new NotFoundException(
                'Torneo no encontrado',
            );
        }

        return this.prisma.tournament.update({
            where: {
                id,
            },
            data: {
                active: false,
            },
        });
    }

}