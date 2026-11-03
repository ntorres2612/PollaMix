import {
  validatePrizeClosure,
  type ClosureValidationInput,
} from './prize-closure-validation';

describe('Validación de cierre definitivo PollaMix', () => {
  const validInput = (): ClosureValidationInput => ({
    tournamentEnded: true,
    inscriptionCOP: 16000,
    matches: Array.from({ length: 10 }, () => ({
      finished: true,
      scoredAt: new Date(),
      homeScore: 2,
      awayScore: 1,
    })),
    payments: [
      {
        userId: 1,
        participantId: 101,
        amount: 16000,
        currency: 'COP',
      },
      {
        userId: 2,
        participantId: 102,
        amount: 16000,
        currency: 'COP',
      },
    ],
    participants: [
      { id: 101, userId: 1, paid: true },
      { id: 102, userId: 2, paid: true },
    ],
  });

  it('permite un escenario válido', () => {
    expect(validatePrizeClosure(validInput())).toMatchObject({
      ready: true,
      errors: [],
      paidPlayers: 2,
      revenueCOP: 32000,
    });
  });

  it('bloquea un torneo sin finalizar', () => {
    const input = validInput();
    input.tournamentEnded = false;

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('bloquea partidos pendientes', () => {
    const input = validInput();
    input.matches[0].finished = false;

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('exige diez partidos seleccionados', () => {
    const input = validInput();
    input.matches.pop();

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('rechaza importes inferiores a la inscripción', () => {
    const input = validInput();
    input.payments[0].amount = 500;

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('rechaza pagos duplicados', () => {
    const input = validInput();
    input.payments.push({ ...input.payments[0] });

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('rechaza participantes no pagados', () => {
    const input = validInput();
    input.participants[0].paid = false;

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('rechaza pagos sin participante válido', () => {
    const input = validInput();
    input.payments[0].participantId = null;

    expect(validatePrizeClosure(input).ready).toBe(false);
  });

  it('rechaza el cierre sin pagos aprobados', () => {
    const input = validInput();
    input.payments = [];

    expect(validatePrizeClosure(input).ready).toBe(false);
  });
});
