import type { Transaction } from '../../domain/Transaction.js';

const BANK = 'BBVA';
const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function parseSpanishDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

export function parseBbvaRow(row: unknown[]): Transaction | null {
  const fecha = row[2]; // col C
  const date = parseSpanishDate(fecha);
  if (!date) return null;

  const importe = row[5]; // col F
  if (typeof importe !== 'number') return null;

  const concepto = typeof row[3] === 'string' ? row[3].trim() : '';
  const observaciones = typeof row[9] === 'string' ? row[9].trim() : '';
  const description = `${concepto} ${observaciones}`.trim();

  return {
    date,
    description,
    amount: Math.round(importe * 100) / 100,
    bank: BANK,
  };
}
