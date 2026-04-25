import type { CashflowRepository } from '../domain/CashflowRepository.js';
import type { Transaction } from '../domain/Transaction.js';

export type ImportResult = {
  added: number;
  skipped: number;
};

const dedupKey = (t: Transaction): string => {
  const day = t.date.toISOString().slice(0, 10);
  const amount = Math.round(t.amount * 100) / 100;
  return `${day}|${t.bank ?? ''}|${amount}`;
};

export async function importTransactions(
  repo: CashflowRepository,
  incoming: Transaction[],
): Promise<ImportResult> {
  const existing = await repo.listAll();

  const remaining = new Map<string, number>();
  for (const t of incoming) {
    const key = dedupKey(t);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  for (const t of existing) {
    const key = dedupKey(t);
    const current = remaining.get(key);
    if (current !== undefined) {
      if (current === 1) remaining.delete(key);
      else remaining.set(key, current - 1);
    }
  }

  const newOnes: Transaction[] = [];
  const toAdd = new Map(remaining);
  for (const t of incoming) {
    const key = dedupKey(t);
    const left = toAdd.get(key) ?? 0;
    if (left > 0) {
      newOnes.push(t);
      if (left === 1) toAdd.delete(key);
      else toAdd.set(key, left - 1);
    }
  }

  if (newOnes.length > 0) {
    await repo.appendMany(newOnes);
  }

  return { added: newOnes.length, skipped: incoming.length - newOnes.length };
}
