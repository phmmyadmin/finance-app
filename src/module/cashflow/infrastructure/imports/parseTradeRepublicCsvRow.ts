import { categorize } from '../../domain/categorize.js';
import type { Transaction } from '../../domain/Transaction.js';

const BANK = 'TRADE_REPUBLIC';
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTradeRepublicCsvRow(row: string[]): Transaction | null {
  const fechaRaw = row[1]?.replace(/"/g, '').trim();
  if (!fechaRaw) return null;

  if (!ISO_DATE_RE.test(fechaRaw)) return null;
  const date = new Date(`${fechaRaw}T00:00:00.000Z`);

  const importeRaw = row[10]?.replace(/"/g, '').trim();
  if (!importeRaw) return null;
  const amount = Number(importeRaw);
  if (!Number.isFinite(amount)) return null;

  const name = row[6]?.replace(/"/g, '').trim();
  const desc = row[17]?.replace(/"/g, '').trim();

  let description = desc;
  if (!description || description === '') {
    description = name || '';
  }

  const roundedAmount = Math.round(amount * 100) / 100;

  return {
    date,
    description,
    amount: roundedAmount,
    bank: BANK,
    category: categorize({ description, amount: roundedAmount }),
  };
}
