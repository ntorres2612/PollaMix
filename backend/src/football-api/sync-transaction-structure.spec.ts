/**
 * Pruebas estructurales de regresión. NO sustituyen pruebas de integración:
 * no simulan el proveedor remoto ni una transacción PostgreSQL real.
 */
import * as fs from 'fs';
import * as path from 'path';

const football = fs.readFileSync(path.join(__dirname, 'football-api.service.ts'), 'utf8');
const espn = fs.readFileSync(path.join(__dirname, 'espn/espn-football.service.ts'), 'utf8');

const resultsStart = football.lastIndexOf('const existingMatch =');
const resultTxStart = football.indexOf('const committedScoring = await this.prisma.$transaction(', resultsStart);
const resultTxEnd = football.indexOf('}, { timeout: 20000 });', resultTxStart);

const resultTx = football.slice(resultTxStart, resultTxEnd);
const afterResultTx = football.slice(resultTxEnd, resultTxEnd + 180);

describe('Invariantes estructurales de sincronización (no integración)', () => {
  it('API-Football bloquea partido antes de actualizar resultados', () => {
    expect(resultTxStart).toBeGreaterThan(resultsStart);
    const guard = resultTx.indexOf('lockMatchForPrizeSafeUpdate(tx, existingMatch.id)');
    const write = resultTx.indexOf('await tx.match.update(');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(write).toBeGreaterThan(guard);
  });

  it('API-Football puntúa con el mismo cliente de la transacción', () => {
    expect(resultTx).toContain('this.scoringService.scoreMatchInTransaction(');
    expect(resultTx).toMatch(/scoreMatchInTransaction\(\s*tx\s*,/);
  });

  it('API-Football contabiliza resultados solo después de confirmar la transacción', () => {
    expect(resultTx).not.toMatch(/\bupdated\+\+|\bscored\+\+/);
    expect(afterResultTx).toContain('updated++;');
    expect(afterResultTx).toContain('if (committedScoring) scored++;');
  });

  it('ESPN bloquea y puntúa dentro de la misma transacción', () => {
    const sectionStart = espn.indexOf('const { match, scoringResult } = await this.prisma.$transaction(');
    const sectionEnd = espn.indexOf('{ timeout: 20000 }', sectionStart);
    expect(sectionStart).toBeGreaterThanOrEqual(0);
    expect(sectionEnd).toBeGreaterThan(sectionStart);
    const section = espn.slice(sectionStart, sectionEnd);
    const lock = section.indexOf('lockMatchForPrizeSafeUpdate(tx, existingMatch.id)');
    const update = section.indexOf('await tx.match.update(');
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(update).toBeGreaterThan(lock);
    expect(section).toMatch(/scoreMatchInTransaction\(tx, match\.id\)/);
  });
});
