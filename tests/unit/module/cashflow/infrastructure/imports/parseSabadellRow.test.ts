import { describe, it, expect } from 'vitest';
import { parseSabadellRow } from '../../../../../../src/module/cashflow/infrastructure/imports/parseSabadellRow.js';

// Sabadell "Hoja1" row layout:
// 0=A F.Operativa | 1=B Concepto | 2=C F.Valor | 3=D Importe | 4=E Saldo
// | 5=F Referencia 1 | 6=G Referencia 2

describe('parseSabadellRow', () => {
  it('parses a standard Sabadell data row', () => {
    const row = [
      '24/04/2026',
      'COMPRA TARJ. 5402XXXXXXXX8019 THE YVORY-BARCELONA',
      '26/04/2026',
      -19.3,
      17576.61,
      '',
      '5402__8019',
    ];

    expect(parseSabadellRow(row)).toEqual({
      date: new Date(Date.UTC(2026, 3, 24)),
      description: 'COMPRA TARJ. 5402XXXXXXXX8019 THE YVORY-BARCELONA',
      amount: -19.3,
      bank: 'SABADELL',
      category: 'restaurants',
    });
  });

  it('returns null for header rows or rows without a parseable date', () => {
    expect(parseSabadellRow(['F. Operativa', 'Concepto', 'F. Valor'])).toBeNull();
    expect(parseSabadellRow([])).toBeNull();
    expect(parseSabadellRow(['', 'desc', '01/01/2026', 10])).toBeNull();
  });

  it('returns null when amount is missing', () => {
    expect(parseSabadellRow(['01/03/2026', 'desc', '01/03/2026', null])).toBeNull();
    expect(parseSabadellRow(['01/03/2026', 'desc', '01/03/2026', ''])).toBeNull();
  });

  it('rounds amount to 2 decimals', () => {
    const row = ['01/03/2026', 'desc', '01/03/2026', 0.1 + 0.2];
    expect(parseSabadellRow(row)?.amount).toBe(0.3);
  });
});
