/**
 * Pruebas estructurales de regresión. NO sustituyen pruebas de integración:
 * no simulan el proveedor remoto ni una transacción PostgreSQL real.
 */
import * as fs from 'fs';
import * as path from 'path';

const football = fs.readFileSync(path.join(__dirname, 'football-api.service.ts'), 'utf8');

const updateStart = football.indexOf('async updateResults(');
const updateEnd = football.indexOf('\n  async ', updateStart + 20);
const updateFn = football.slice(updateStart, updateEnd);

const resultsStart = updateFn.indexOf('const existingMatch =');
const resultTxStart = updateFn.indexOf(
  'const committedScoring = await this.prisma.$transaction(',
  resultsStart,
);
const resultTxEnd = updateFn.indexOf('}, { timeout: 120000 });', resultTxStart);

const resultTx = updateFn.slice(resultTxStart, resultTxEnd);
const afterResultTx = updateFn.slice(resultTxEnd, resultTxEnd + 180);

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
});
