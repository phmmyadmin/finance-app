import type { Category } from '../domain/Category.js';
import { categorize } from '../domain/categorize.js';
import type { Transaction } from '../domain/Transaction.js';

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

const KNOWN_CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  'groceries',
  'restaurants',
  'transport',
  'utilities',
  'subscriptions',
  'shopping',
  'entertainment',
  'cash_withdrawal',
  'investments',
  'transfers_self',
  'income',
  'uncategorized',
]);

function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_UTC_MS + serial * MS_PER_DAY);
}

export function parseRows(rows: unknown[][]): Transaction[] {
  const transactions: Transaction[] = [];

  for (const row of rows) {
    const [rawDate, rawDescription, rawAmount, , , rawBank, rawCategory] = row;
    if (typeof rawDate !== 'number') continue;

    const description =
      typeof rawDescription === 'string' ? rawDescription : String(rawDescription ?? '');
    const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount ?? 0);
    const persistedCategory =
      typeof rawCategory === 'string' && KNOWN_CATEGORIES.has(rawCategory as Category)
        ? (rawCategory as Category)
        : undefined;

    transactions.push({
      date: serialToDate(rawDate),
      description,
      amount,
      bank: typeof rawBank === 'string' && rawBank.length > 0 ? rawBank : null,
      category: persistedCategory ?? categorize({ description, amount }),
    });
  }

  return transactions;
}
