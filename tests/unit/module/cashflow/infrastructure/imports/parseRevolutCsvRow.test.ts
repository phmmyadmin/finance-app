import { describe, it, expect } from 'vitest';
import { parseRevolutCsvRow } from '../../../../../../src/module/cashflow/infrastructure/imports/parseRevolutCsvRow.js';

// Revolut CSV columns:
// 0=Tipo | 1=Producto | 2=Fecha de inicio | 3=Fecha de finalización
// | 4=Descripción | 5=Importe | 6=Comisión | 7=Divisa | 8=State | 9=Saldo

describe('parseRevolutCsvRow', () => {
  it('parses a standard Revolut data row', () => {
    const row = [
      'Pago con tarjeta',
      'Actual',
      '2026-04-22 18:50:10',
      '2026-04-23 12:05:55',
      'Ilusiona',
      '-1.00',
      '0.00',
      'EUR',
      'COMPLETADO',
      '1.23',
    ];

    expect(parseRevolutCsvRow(row)).toEqual({
      date: new Date(Date.UTC(2026, 3, 22)),
      description: 'Ilusiona',
      amount: -1,
      bank: 'REVOLUT',
      category: 'uncategorized',
    });
  });

  it('returns null for header rows (no parseable date)', () => {
    expect(
      parseRevolutCsvRow([
        'Tipo',
        'Producto',
        'Fecha de inicio',
        'Fecha de finalización',
        'Descripción',
        'Importe',
      ]),
    ).toBeNull();
  });

  it('returns null when amount is missing or invalid', () => {
    const baseRow = ['Pago', 'Actual', '2026-04-22 18:50:10', '', 'desc', '', '', 'EUR'];
    expect(parseRevolutCsvRow(baseRow)).toBeNull();
    const nan = [...baseRow];
    nan[5] = 'not-a-number';
    expect(parseRevolutCsvRow(nan)).toBeNull();
  });

  it('preserves description with special characters', () => {
    const row = [
      'Transferir',
      'Actual',
      '2026-04-01 17:56:18',
      '',
      'EUR → Revolut X',
      '-198.89',
      '0',
      'EUR',
    ];
    expect(parseRevolutCsvRow(row)?.description).toBe('EUR → Revolut X');
  });

  it('rounds amount to 2 decimals', () => {
    const row = ['T', 'Actual', '2026-01-01 00:00:00', '', 'd', String(0.1 + 0.2)];
    expect(parseRevolutCsvRow(row)?.amount).toBe(0.3);
  });
});
