import { canPublishWinners } from './prize-publication';

describe('Publicación de ganadores PollaMix', () => {
  it('publica cuando se cumplen las tres condiciones', () => {
    expect(canPublishWinners({
      tournamentEnded: true,
      matchesReady: true,
      paymentsReady: true,
    })).toBe(true);
  });

  it('bloquea si el torneo no ha terminado', () => {
    expect(canPublishWinners({
      tournamentEnded: false,
      matchesReady: true,
      paymentsReady: true,
    })).toBe(false);
  });

  it('bloquea si existen partidos pendientes', () => {
    expect(canPublishWinners({
      tournamentEnded: true,
      matchesReady: false,
      paymentsReady: true,
    })).toBe(false);
  });

  it('bloquea si existen pagos inconsistentes', () => {
    expect(canPublishWinners({
      tournamentEnded: true,
      matchesReady: true,
      paymentsReady: false,
    })).toBe(false);
  });

  it('bloquea cuando ninguna condición se cumple', () => {
    expect(canPublishWinners({
      tournamentEnded: false,
      matchesReady: false,
      paymentsReady: false,
    })).toBe(false);
  });
});
