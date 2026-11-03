export interface ClosureMatch {
  finished: boolean;
  scoredAt: Date | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ClosurePayment {
  userId: number;
  participantId: number | null;
  amount: number;
  currency: string;
}

export interface ClosureParticipant {
  id: number;
  userId: number;
  paid: boolean;
}

export interface ClosureValidationInput {
  tournamentEnded: boolean;
  inscriptionCOP: number;
  matches: ClosureMatch[];
  payments: ClosurePayment[];
  participants: ClosureParticipant[];
}

export interface ClosureValidationResult {
  ready: boolean;
  errors: string[];
  paidPlayers: number;
  revenueCOP: number;
}

export function validatePrizeClosure(
  input: ClosureValidationInput,
): ClosureValidationResult {
  const errors: string[] = [];

  if (!input.tournamentEnded) {
    errors.push('El torneo todavía no ha finalizado.');
  }

  if (
    !Number.isSafeInteger(input.inscriptionCOP) ||
    input.inscriptionCOP <= 0
  ) {
    errors.push('La inscripción COP no es válida.');
  }

  if (input.matches.length !== 10) {
    errors.push(
      'El torneo debe tener exactamente 10 partidos seleccionados.',
    );
  }

  if (
    input.matches.some((match) =>
      !match.finished ||
      match.scoredAt === null ||
      !Number.isSafeInteger(match.homeScore) ||
      !Number.isSafeInteger(match.awayScore) ||
      (match.homeScore ?? -1) < 0 ||
      (match.awayScore ?? -1) < 0
    )
  ) {
    errors.push(
      'Existen partidos sin terminar, sin marcador o sin puntuar.',
    );
  }

  if (input.payments.length === 0) {
    errors.push('No existen pagos aprobados.');
  }

  const participantById = new Map(
    input.participants.map((p) => [p.id, p]),
  );

  const userIds = new Set<number>();
  const participantIds = new Set<number>();

  let revenueCOP = 0;

  for (const payment of input.payments) {
    if (
      !Number.isSafeInteger(payment.userId) ||
      payment.userId <= 0 ||
      userIds.has(payment.userId)
    ) {
      errors.push('Existen pagos aprobados duplicados o inválidos.');
    }

    userIds.add(payment.userId);

    if (
      payment.currency !== 'COP' ||
      !Number.isSafeInteger(payment.amount) ||
      payment.amount !== input.inscriptionCOP
    ) {
      errors.push('Existe un pago aprobado con importe incorrecto.');
    }

    if (
      payment.participantId === null ||
      participantIds.has(payment.participantId)
    ) {
      errors.push('Existe un participante de pago inválido o duplicado.');
    } else {
      participantIds.add(payment.participantId);

      const participant = participantById.get(payment.participantId);

      if (
        !participant ||
        participant.userId !== payment.userId ||
        !participant.paid
      ) {
        errors.push(
          'El pago no corresponde a un participante pagado válido.',
        );
      }
    }

    revenueCOP += payment.amount;
  }

  if (!Number.isSafeInteger(revenueCOP) || revenueCOP < 0) {
    errors.push('La recaudación COP no es válida.');
  }

  return {
    ready: errors.length === 0,
    errors: [...new Set(errors)],
    paidPlayers: userIds.size,
    revenueCOP,
  };
}
