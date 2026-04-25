import { categorize } from '../../domain/categorize.js';
import type { Transaction } from '../../domain/Transaction.js';

const BANK = 'SABADELL';
const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function parseSpanishDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

export function parseSabadellRow(row: unknown[]): Transaction | null {
  const date = parseSpanishDate(row[0]); // col A
  if (!date) return null;

  const importe = row[3]; // col D
  if (typeof importe !== 'number') return null;

  const concepto = typeof row[1] === 'string' ? row[1].trim() : '';
  const amount = Math.round(importe * 100) / 100;

  return {
    date,
    description: concepto,
    amount,
    bank: BANK,
    category: categorize({ description: concepto, amount }),
  };
}
