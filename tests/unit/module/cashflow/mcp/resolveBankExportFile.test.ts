import { describe, it, expect } from 'vitest';
import { resolveBankExportFile } from '../../../../../src/module/cashflow/mcp/resolveBankExportFile.js';

const fakeFs = (entries: { name: string; mtimeMs: number }[]) => ({
  homedir: '/Users/pablo',
  listDirectory: (_dir: string) => entries,
});

describe('resolveBankExportFile', () => {
  it('returns absolute paths unchanged', () => {
    const fs = fakeFs([]);
    expect(resolveBankExportFile('bbva', '/abs/path/bbva.xlsx', fs)).toBe('/abs/path/bbva.xlsx');
  });

  it('expands ~ to homedir', () => {
    const fs = fakeFs([]);
    expect(resolveBankExportFile('bbva', '~/Downloads/foo.xlsx', fs)).toBe(
      '/Users/pablo/Downloads/foo.xlsx',
    );
  });

  it('searches the default Downloads folder when given a hint', () => {
    const fs = fakeFs([
      { name: 'random.txt', mtimeMs: 100 },
      { name: 'bbva-april.xlsx', mtimeMs: 200 },
      { name: 'sabadell.xls', mtimeMs: 300 },
    ]);
    expect(resolveBankExportFile('bbva', 'april', fs)).toBe(
      '/Users/pablo/Downloads/bbva-april.xlsx',
    );
  });

  it('matches hint case-insensitively', () => {
    const fs = fakeFs([{ name: 'BBVA-Q1.xlsx', mtimeMs: 100 }]);
    expect(resolveBankExportFile('bbva', 'q1', fs)).toBe('/Users/pablo/Downloads/BBVA-Q1.xlsx');
  });

  it('picks the most recent file when multiple match', () => {
    const fs = fakeFs([
      { name: 'bbva-jan.xlsx', mtimeMs: 100 },
      { name: 'bbva-feb.xlsx', mtimeMs: 200 },
      { name: 'bbva-mar.xlsx', mtimeMs: 300 },
    ]);
    expect(resolveBankExportFile('bbva', undefined, fs)).toBe(
      '/Users/pablo/Downloads/bbva-mar.xlsx',
    );
  });

  it('filters by the bank-specific extension', () => {
    const fs = fakeFs([
      { name: 'bbva.xls', mtimeMs: 300 }, // wrong extension for bbva (.xlsx)
      { name: 'bbva.xlsx', mtimeMs: 100 },
    ]);
    expect(resolveBankExportFile('bbva', undefined, fs)).toBe('/Users/pablo/Downloads/bbva.xlsx');
  });

  it.each([
    ['bbva', 'foo.xlsx'],
    ['sabadell', 'foo.xls'],
    ['revolut', 'foo.csv'],
  ] as const)('uses the right extension for %s', (bank, name) => {
    const fs = fakeFs([{ name, mtimeMs: 100 }]);
    expect(resolveBankExportFile(bank, undefined, fs)).toBe(`/Users/pablo/Downloads/${name}`);
  });

  it('throws when no file matches', () => {
    const fs = fakeFs([{ name: 'unrelated.txt', mtimeMs: 100 }]);
    expect(() => resolveBankExportFile('bbva', 'nope', fs)).toThrow(/no bbva export/i);
  });

  it('throws on unknown bank', () => {
    const fs = fakeFs([]);
    expect(() => resolveBankExportFile('mystery', undefined, fs)).toThrow(/unknown bank/i);
  });
});
