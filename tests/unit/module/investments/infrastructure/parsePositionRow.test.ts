import { describe, it, expect } from 'vitest';
import { parsePositionRow } from '../../../../../src/module/investments/infrastructure/parsePositionRow.js';

// Sheet schema: A=Name, B=Invested Date (serial), C=Type, D=Investment (€),
// E=Investment (%), F=Expected Profit (€), G=Expected Profit (%),
// H=Expected Time (months), I=Expected End Date (serial)

const EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;
const toSerial = (date: Date): number => Math.round((date.getTime() - EPOCH_UTC_MS) / MS_PER_DAY);

describe('parsePositionRow', () => {
  it('parses a fully populated row into a Position with terms', () => {
    const acquired = new Date(Date.UTC(2023, 10, 30));
    const maturity = new Date(Date.UTC(2026, 6, 30));
    const row = [
      'Ibiza | Roca Llisa',
      toSerial(acquired),
      'Added value',
      2500,
      100,
      1150,
      46,
      32,
      toSerial(maturity),
    ];

    const result = parsePositionRow('Urbanitae', row);

    expect(result).toEqual({
      platform: 'Urbanitae',
      name: 'Ibiza | Roca Llisa',
      assetClass: 'real_estate',
      principal: { amount: 2500, currency: 'EUR' },
      acquiredAt: acquired,
      terms: {
        expectedReturn: { amount: 1150, currency: 'EUR' },
        maturityAt: maturity,
      },
    });
  });

  it('omits terms when expected profit or end date are missing', () => {
    const row = ['de la familia', null, null, 1500, null, null, null, null, null];

    const result = parsePositionRow('Revolut X', row);

    expect(result).toEqual({
      platform: 'Revolut X',
      name: 'de la familia',
      assetClass: 'cash',
      principal: { amount: 1500, currency: 'EUR' },
      acquiredAt: null,
    });
    expect(result?.terms).toBeUndefined();
  });

  it('returns null when the row has no name', () => {
    expect(parsePositionRow('Mintos', [null, null, null, null])).toBeNull();
    expect(parsePositionRow('Mintos', ['', 45260, 'Lend', 100])).toBeNull();
    expect(parsePositionRow('Mintos', [])).toBeNull();
  });

  it('returns null when the row has no investment amount', () => {
    expect(parsePositionRow('Mintos', ['Some name', 45260, 'Lend', null])).toBeNull();
  });

  it.each([
    ['Index Fund', 'equity'],
    ['Lend', 'debt'],
    ['Real Estate', 'real_estate'],
    ['Added value', 'real_estate'],
    ['Cripto', 'crypto'],
  ] as const)('maps sheet type %s to asset class %s', (sheetType, expected) => {
    const row = ['Name', 45260, sheetType, 100];
    expect(parsePositionRow('X', row)?.assetClass).toBe(expected);
  });

  it('falls back to cash for unknown types', () => {
    const row = ['Name', 45260, 'Mystery', 100];
    expect(parsePositionRow('X', row)?.assetClass).toBe('cash');
  });
});
