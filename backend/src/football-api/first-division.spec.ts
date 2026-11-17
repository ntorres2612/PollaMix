import {
  isAvailableKickoff,
  isBoardFixture,
  isBoardLeague,
  isFirstDivisionLeague,
  isSeniorNationalTeamLeague,
} from './first-division';

describe('primera división', () => {
  it('acepta la primera división y deja afuera el resto', () => {
    expect(isFirstDivisionLeague(39)).toBe(true);
    expect(isFirstDivisionLeague(140)).toBe(true);
    expect(isFirstDivisionLeague(135)).toBe(true);
    expect(isFirstDivisionLeague(78)).toBe(true);
    expect(isFirstDivisionLeague(71)).toBe(true);
    expect(isFirstDivisionLeague(239)).toBe(true);
    expect(isFirstDivisionLeague(262)).toBe(true);

    expect(isFirstDivisionLeague(40)).toBe(false);
    expect(isFirstDivisionLeague(136)).toBe(false);
    expect(isFirstDivisionLeague(141)).toBe(false);
    expect(isFirstDivisionLeague(96)).toBe(false);
    expect(isFirstDivisionLeague(536)).toBe(false);
    expect(isFirstDivisionLeague(58)).toBe(false);
    expect(isFirstDivisionLeague(444)).toBe(false);
    expect(isFirstDivisionLeague(435)).toBe(false);
    expect(isFirstDivisionLeague(722)).toBe(false);
    expect(isFirstDivisionLeague(10)).toBe(false);
    expect(isFirstDivisionLeague(34)).toBe(false);
  });

  it('suma amistosos y eliminatorias de mayores', () => {
    expect(isSeniorNationalTeamLeague(10)).toBe(true);
    expect(isSeniorNationalTeamLeague(34)).toBe(true);
    expect(isSeniorNationalTeamLeague(32)).toBe(true);
    expect(isSeniorNationalTeamLeague(31)).toBe(true);
    expect(isSeniorNationalTeamLeague(29)).toBe(true);
    expect(isSeniorNationalTeamLeague(36)).toBe(true);
    expect(isSeniorNationalTeamLeague(960)).toBe(true);

    expect(isBoardLeague(239)).toBe(true);
    expect(isBoardLeague(10)).toBe(true);
    expect(isBoardLeague(34)).toBe(true);

    expect(isSeniorNationalTeamLeague(667)).toBe(false);
    expect(isSeniorNationalTeamLeague(536)).toBe(false);
    expect(isSeniorNationalTeamLeague(1)).toBe(false);
    expect(isSeniorNationalTeamLeague(587)).toBe(false);
    expect(isBoardLeague(667)).toBe(false);
    expect(isBoardLeague(40)).toBe(false);

    expect(isBoardFixture(10, 'Chile', 'Colombia')).toBe(true);
    expect(isBoardFixture(10, 'Croatia U21', 'Germany U21')).toBe(false);
    expect(isBoardFixture(10, 'Switzerland U17', 'Czechia U17')).toBe(false);
    expect(isBoardFixture(239, 'Junior', 'Millonarios')).toBe(true);
  });

  it('solo deja fechas que todavía no empiezan', () => {
    const now = Date.parse('2026-11-17T15:00:00.000Z');
    const later = new Date('2026-11-18T00:00:00.000Z');
    const earlier = new Date('2026-11-16T19:00:00.000Z');

    expect(isAvailableKickoff(later, 'NS', now)).toBe(true);
    expect(isAvailableKickoff(earlier, 'NS', now)).toBe(false);
    expect(isAvailableKickoff(later, 'FT', now)).toBe(false);
    expect(isAvailableKickoff(later, '1H', now)).toBe(false);
    expect(isAvailableKickoff(later, 'CANC', now)).toBe(false);
  });
});
