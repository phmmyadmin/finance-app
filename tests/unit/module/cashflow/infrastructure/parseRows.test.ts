import { describe, it, expect } from 'vitest';
import { parseRows } from '../../../../../src/module/cashflow/infrastructure/parseRows.js';

describe('parseRows', () => {
  it('parses sheet rows into transactions', () => {
    const rows = [
      [42370, '2016', 102.17, 3767, 102.17, 'BBVA'],
      [42738, 'Norma comics Pago con tarjeta', -17, 3399, 85.17, 'BBVA'],
    ];

    const result = parseRows(rows);

    expect(result).toEqual([
      {
        date: new Date(Date.UTC(2016, 0, 1)),
        description: '2016',
        amount: 102.17,
        bank: 'BBVA',
        category: 'uncategorized',
      },
      {
        date: new Date(Date.UTC(2017, 0, 3)),
        description: 'Norma comics Pago con tarjeta',
        amount: -17,
        bank: 'BBVA',
        category: 'shopping',
      },
    ]);
  });

  it('treats empty bank cell as null', () => {
    const rows = [[45698, 'Ajuste de cuentas', 6, 439, 13941.59, '']];

    expect(parseRows(rows)).toEqual([
      {
        date: new Date(Date.UTC(2025, 1, 10)),
        description: 'Ajuste de cuentas',
        amount: 6,
        bank: null,
        category: 'uncategorized',
      },
    ]);
  });

  it('treats missing bank column as null', () => {
    const rows = [[45698, 'Ajuste de cuentas', 6, 439, 13941.59]];

    expect(parseRows(rows)).toEqual([
      {
        date: new Date(Date.UTC(2025, 1, 10)),
        description: 'Ajuste de cuentas',
        amount: 6,
        bank: null,
        category: 'uncategorized',
      },
    ]);
  });

  it('uses the persisted category from column G when present', () => {
    const rows = [[45698, 'Some random description', -10, 0, 0, 'BBVA', 'restaurants']];
    expect(parseRows(rows)[0]?.category).toBe('restaurants');
  });

  it('falls back to categorize when column G is empty or invalid', () => {
    const rows = [
      [45698, 'MERCADONA Sants', -30, 0, 0, 'BBVA', ''],
      [45698, 'KFC EL VENDRELL', -10, 0, 0, 'BBVA', 'not-a-known-category'],
    ];
    const result = parseRows(rows);
    expect(result[0]?.category).toBe('groceries');
    expect(result[1]?.category).toBe('restaurants');
  });

  it('skips rows without a date', () => {
    const rows = [[], [45698, 'Ajuste de cuentas', 6, 439, 13941.59, '']];

    const result = parseRows(rows);

    expect(result).toHaveLength(1);
  });
});
