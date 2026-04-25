import { categorize } from '../../domain/categorize.js';
import type { Transaction } from '../../domain/Transaction.js';

const BANK = 'REVOLUT';
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseRevolutCsvRow(row: string[]): Transaction | null {
  const fechaRaw = row[2]?.trim();
  if (!fechaRaw) return null;
  const datePart = fechaRaw.slice(0, 10);
  if (!ISO_DATE_RE.test(datePart)) return null;
  const date = new Date(`${datePart}T00:00:00.000Z`);

  const importeRaw = row[5]?.trim();
  if (!importeRaw) return null;
  const amount = Number(importeRaw);
  if (!Number.isFinite(amount)) return null;

  const description = row[4]?.trim() ?? '';
  const roundedAmount = Math.round(amount * 100) / 100;

  return {
    date,
    description,
    amount: roundedAmount,
    bank: BANK,
    category: categorize({ description, amount: roundedAmount }),
  };
}
