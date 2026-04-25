import type { Transaction } from '../domain/Transaction.js';

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_UTC_MS + serial * MS_PER_DAY);
}

export function parseRows(rows: unknown[][]): Transaction[] {
  const transactions: Transaction[] = [];

  for (const row of rows) {
    const [rawDate, rawDescription, rawAmount, , , rawBank] = row;
    if (typeof rawDate !== 'number') continue;

    transactions.push({
      date: serialToDate(rawDate),
      description:
        typeof rawDescription === 'string' ? rawDescription : String(rawDescription ?? ''),
      amount: typeof rawAmount === 'number' ? rawAmount : Number(rawAmount ?? 0),
      bank: typeof rawBank === 'string' && rawBank.length > 0 ? rawBank : null,
    });
  }

  return transactions;
}
