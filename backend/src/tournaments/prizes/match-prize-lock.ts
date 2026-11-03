import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  assertMatchNotPrizeClosed,
} from './match-prize-closure.guard';

/**
 * Preparación transaccional para actualizar un partido.
 *
 * Orden de bloqueo:
 * 1. Torneos asociados, ordenados por ID.
 * 2. Partido.
 * 3. Comprobación de cierres.
 *
 * El llamador debe realizar la modificación utilizando
 * el MISMO cliente transaccional `tx`.
 */
export async function lockMatchForPrizeSafeUpdate(
  tx: Prisma.TransactionClient,
  matchId: number,
): Promise<void> {
  if (!Number.isSafeInteger(matchId) || matchId <= 0) {
    throw new BadRequestException(
      'Identificador de partido inválido.',
    );
  }

  const getTournamentIds = async (): Promise<number[]> => {
    const relations = await tx.tournamentMatch.findMany({
      where: { matchId },
      select: { tournamentId: true },
      orderBy: { tournamentId: 'asc' },
    });

    return [
      ...new Set(relations.map(row => row.tournamentId)),
    ].sort((a, b) => a - b);
  };

  const tournamentIds = await getTournamentIds();

  if (tournamentIds.length > 0) {
    await tx.$queryRaw`
      SELECT id FROM "Tournament"
      WHERE id IN (${Prisma.join(tournamentIds)})
      ORDER BY id
      FOR UPDATE
    `;
  }

  await tx.$queryRaw`
    SELECT id FROM "Match"
    WHERE id = ${matchId}
    FOR UPDATE
  `;

  // Detectar cambios en las relaciones durante
  // la adquisición de los bloqueos.
  const currentTournamentIds = await getTournamentIds();

  if (
    tournamentIds.length !== currentTournamentIds.length ||
    tournamentIds.some(
      (id, index) => id !== currentTournamentIds[index],
    )
  ) {
    throw new BadRequestException(
      'Cambió la selección de torneos del partido. Reintenta.',
    );
  }

  await assertMatchNotPrizeClosed(tx, matchId);
}
