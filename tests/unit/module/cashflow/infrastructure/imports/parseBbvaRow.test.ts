import { describe, it, expect } from 'vitest';
import { parseBbvaRow } from '../../../../../../src/module/cashflow/infrastructure/imports/parseBbvaRow.js';

// xlsx.sheet_to_json drops leading empty columns. Effective row layout:
// 0=F.Valor | 1=Fecha | 2=Concepto | 3=Movimiento | 4=Importe
// | 5=Divisa | 6=Disponible | 7=Divisa | 8=Observaciones

describe('parseBbvaRow', () => {
  it('parses a standard BBVA data row', () => {
    const row = [
      '24/04/2026',
      '24/04/2026',
      'Transferencia recibida',
      'Withdrawal from investor account no 59005829',
      60.64,
      'EUR',
      273.86,
      'EUR',
      'Withdrawal from Investor account No 59005829',
    ];

    expect(parseBbvaRow(row)).toEqual({
      date: new Date(Date.UTC(2026, 3, 24)),
      description: 'Transferencia recibida Withdrawal from Investor account No 59005829',
      amount: 60.64,
      bank: 'BBVA',
    });
  });

  it('returns null for header rows (no parseable date)', () => {
    expect(parseBbvaRow(['F.Valor', 'Fecha', 'Concepto'])).toBeNull();
    expect(parseBbvaRow([])).toBeNull();
  });

  it('returns null when amount is missing', () => {
    const row = ['24/04/2026', '24/04/2026', 'Concepto', 'Mov', null, 'EUR'];
    expect(parseBbvaRow(row)).toBeNull();
  });

  it('uses concepto alone when observations are missing', () => {
    const row = ['01/03/2026', '01/03/2026', 'Concepto solo', 'Mov', -10, 'EUR'];
    expect(parseBbvaRow(row)?.description).toBe('Concepto solo');
  });

  it('rounds amount to 2 decimals', () => {
    const row = ['01/03/2026', '01/03/2026', 'C', 'M', 0.1 + 0.2, 'EUR'];
    expect(parseBbvaRow(row)?.amount).toBe(0.3);
  });
});
