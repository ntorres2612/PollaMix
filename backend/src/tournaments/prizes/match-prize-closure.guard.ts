import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Comprueba si un partido pertenece a una Polla
 * cuyos premios ya fueron cerrados.
 *
 * IMPORTANTE:
 * Esta comprobación no adquiere bloqueos por sí sola.
 * Debe utilizarse dentro de una transacción que coordine
 * los bloqueos con el cierre definitivo.
 */
export async function assertMatchNotPrizeClosed(
  tx: Prisma.TransactionClient,
  matchId: number,
): Promise<void> {
  if (!Number.isSafeInteger(matchId) || matchId <= 0) {
    throw new BadRequestException(
      'Identificador de partido inválido.',
    );
  }

  const match = await tx.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });

  if (!match) {
    throw new NotFoundException(
      'El partido no existe.',
    );
  }

  const closure = await tx.tournamentPrizeClosure.findFirst({
    where: {
      tournament: {
        tournamentMatches: {
          some: {
            matchId,
          },
        },
      },
    },
    select: {
      tournamentId: true,
    },
  });

  if (closure) {
    throw new BadRequestException(
      'Este partido pertenece a una Polla con premios cerrados. No se permite modificar sus resultados.',
    );
  }

  // POLLAMIX_BLOCK_PUBLISHED_MATCH
  // El llamador ya bloqueó los torneos asociados.
  const published = await tx.tournament.findFirst({
    where: {
      resultsPublishedAt: { not: null },
      tournamentMatches: {
        some: { matchId },
      },
    },
    select: { id: true },
  });

  if (published) {
    throw new BadRequestException(
      'No se permite modificar un partido asociado a resultados ya publicados.',
    );
  }
}
