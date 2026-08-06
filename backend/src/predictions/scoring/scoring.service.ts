import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateScore } from '../../common/utils/score-calculator';


@Injectable()
export class ScoringService {

    constructor(
        private prisma: PrismaService,
    ) { }

    async scoreMatch(matchId: number) {

        const match = await this.prisma.match.findUnique({

            where: {
                id: matchId,
            },

            include: {
                predictions: true,
            },

        });

        if (!match) {

            throw new NotFoundException(
                'Partido no encontrado',
            );
        }

        if (
            match.homeScore === null ||
            match.awayScore === null
        ) {

            throw new BadRequestException(
                'El partido aún no tiene resultado.',
            );

        }

        for (const prediction of match.predictions) {

            const points = calculateScore(

                prediction.homeScore,
                prediction.awayScore,

                match.homeScore,
                match.awayScore,

            );

            await this.prisma.prediction.update({

                where: {

                    id: prediction.id,

                },

                data: {

                    points,

                },

            });

        }

        return {

            success: true,

            predictions: match.predictions.length,

        };

    }

}