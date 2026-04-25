import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleGetSpendingByCategory,
  spendingByCategoryToolDefinition,
} from '../../../../../src/module/cashflow/mcp/spendingByCategoryTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const tx = (date: string, description: string, amount: number): Transaction => ({
  date: new Date(`${date}T00:00:00.000Z`),
  description,
  amount,
  bank: 'BBVA',
});

const fakeRepo = (transactions: Transaction[]): CashflowRepository => ({
  listAll: async () => transactions,
  appendMany: async () => {},
});

describe('spendingByCategoryToolDefinition', () => {
  it('describes itself with from and to inputs', () => {
    expect(spendingByCategoryToolDefinition.name).toBe('get_spending_by_category');
    expect(spendingByCategoryToolDefinition.inputSchema.properties).toHaveProperty('from');
    expect(spendingByCategoryToolDefinition.inputSchema.properties).toHaveProperty('to');
  });
});

describe('handleGetSpendingByCategory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates transactions by category for the given range', async () => {
    const repo = fakeRepo([
      tx('2026-04-01', 'MERCADONA Sants', -30),
      tx('2026-04-02', 'MERCADONA Gracia', -50),
      tx('2026-04-03', 'KFC EL VENDRELL', -10),
      tx('2026-04-04', 'NOMINA INNOVAMAT EDUCATION', 2000),
      tx('2026-04-05', 'BITCOIN', -100),
      tx('2026-04-06', 'TRANSFERENCIA A pablo hernando revolut', -300),
      tx('2026-04-07', 'Mystery merchant', -25),
    ]);

    const result = JSON.parse(
      await handleGetSpendingByCategory(repo, { from: '2026-04-01', to: '2026-04-30' }),
    );

    expect(result.period).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(result.byCategory).toEqual({
      groceries: -80,
      restaurants: -10,
      income: 2000,
      investments: -100,
      transfers_self: -300,
      uncategorized: -25,
    });
    expect(result.transactionsCount).toBe(7);
  });

  it('defaults to the last 90 days when no range is given', async () => {
    const repo = fakeRepo([
      tx('2026-04-20', 'MERCADONA', -30), // inside 90d
      tx('2025-12-01', 'KFC', -10), // outside 90d
    ]);

    const result = JSON.parse(await handleGetSpendingByCategory(repo));

    expect(result.byCategory).toEqual({ groceries: -30 });
    expect(result.transactionsCount).toBe(1);
  });

  it('returns an empty breakdown when nothing matches the range', async () => {
    const repo = fakeRepo([tx('2025-01-01', 'old', -50)]);

    const result = JSON.parse(
      await handleGetSpendingByCategory(repo, { from: '2026-01-01', to: '2026-01-31' }),
    );

    expect(result.byCategory).toEqual({});
    expect(result.transactionsCount).toBe(0);
  });

  it('rounds aggregates to 2 decimals', async () => {
    const repo = fakeRepo([
      tx('2026-04-10', 'MERCADONA a', -0.1),
      tx('2026-04-11', 'MERCADONA b', -0.2),
    ]);

    const result = JSON.parse(
      await handleGetSpendingByCategory(repo, { from: '2026-04-01', to: '2026-04-30' }),
    );

    expect(result.byCategory.groceries).toBe(-0.3);
  });
});
