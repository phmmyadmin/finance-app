import { describe, it, expect, vi } from 'vitest';
import { importTransactions } from '../../../../../src/module/cashflow/application/importTransactions.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const tx = (
  date: string,
  amount: number,
  bank: string | null,
  description = 'desc',
): Transaction => ({
  date: new Date(`${date}T00:00:00.000Z`),
  description,
  amount,
  bank,
});

const repoWith = (existing: Transaction[]) => {
  const appendMany = vi.fn(async () => {});
  const repo: CashflowRepository = {
    listAll: async () => existing,
    appendMany,
  };
  return { repo, appendMany };
};

describe('importTransactions', () => {
  it('appends all incoming transactions when none exist yet', async () => {
    const incoming = [tx('2024-01-01', 10, 'BBVA'), tx('2024-01-02', -5, 'BBVA')];
    const { repo, appendMany } = repoWith([]);

    const result = await importTransactions(repo, incoming);

    expect(result).toEqual({ added: 2, skipped: 0 });
    expect(appendMany).toHaveBeenCalledOnce();
    expect(appendMany).toHaveBeenCalledWith(incoming);
  });

  it('skips transactions matching existing by (date, bank, amount)', async () => {
    const existing = [tx('2024-01-01', 10, 'BBVA')];
    const incoming = [
      tx('2024-01-01', 10, 'BBVA', 'duplicate'),
      tx('2024-01-02', -5, 'BBVA', 'new'),
    ];
    const { repo, appendMany } = repoWith(existing);

    const result = await importTransactions(repo, incoming);

    expect(result).toEqual({ added: 1, skipped: 1 });
    expect(appendMany).toHaveBeenCalledWith([incoming[1]]);
  });

  it('handles repeated keys by counting occurrences', async () => {
    // 3 identical transactions in source, 1 already exists → add 2
    const existing = [tx('2024-01-01', 5, 'BBVA')];
    const incoming = [
      tx('2024-01-01', 5, 'BBVA', 'a'),
      tx('2024-01-01', 5, 'BBVA', 'b'),
      tx('2024-01-01', 5, 'BBVA', 'c'),
    ];
    const { repo, appendMany } = repoWith(existing);

    const result = await importTransactions(repo, incoming);

    expect(result).toEqual({ added: 2, skipped: 1 });
    // When dedup keys collide, source order is preserved and the FIRST N
    // matching items are kept until the count is exhausted.
    expect(appendMany).toHaveBeenCalledWith([incoming[0], incoming[1]]);
  });

  it('does not call appendMany when nothing is new', async () => {
    const existing = [tx('2024-01-01', 10, 'BBVA')];
    const incoming = [tx('2024-01-01', 10, 'BBVA', 'duplicate')];
    const { repo, appendMany } = repoWith(existing);

    const result = await importTransactions(repo, incoming);

    expect(result).toEqual({ added: 0, skipped: 1 });
    expect(appendMany).not.toHaveBeenCalled();
  });

  it('treats null bank as a distinct dedup key', async () => {
    const existing = [tx('2024-01-01', 10, 'BBVA')];
    const incoming = [tx('2024-01-01', 10, null, 'no-bank-version')];
    const { repo, appendMany } = repoWith(existing);

    const result = await importTransactions(repo, incoming);

    expect(result).toEqual({ added: 1, skipped: 0 });
    expect(appendMany).toHaveBeenCalledWith(incoming);
  });

  it('rounds amounts to 2 decimals when comparing to avoid float artifacts', async () => {
    const existing = [tx('2024-01-01', 0.3, 'X')]; // exact stored value
    const incoming = [tx('2024-01-01', 0.1 + 0.2, 'X')]; // 0.30000000000000004
    const { repo, appendMany } = repoWith(existing);

    const result = await importTransactions(repo, incoming);

    expect(result).toEqual({ added: 0, skipped: 1 });
    expect(appendMany).not.toHaveBeenCalled();
  });
});
