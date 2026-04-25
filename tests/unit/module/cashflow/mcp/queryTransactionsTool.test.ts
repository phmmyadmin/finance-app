import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleQueryTransactions,
  queryTransactionsToolDefinition,
} from '../../../../../src/module/cashflow/mcp/queryTransactionsTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import { categorize } from '../../../../../src/module/cashflow/domain/categorize.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const tx = (
  date: string,
  description: string,
  amount: number = 0,
  bank: string | null = 'BBVA',
): Transaction => ({
  date: new Date(`${date}T00:00:00.000Z`),
  description,
  amount,
  bank,
  category: categorize({ description, amount }),
});

const fakeRepo = (transactions: Transaction[]): CashflowRepository => ({
  listAll: async () => transactions,
  appendMany: async () => {
    throw new Error('appendMany not used in this test');
  },
});

const descriptions = (json: string): string[] =>
  (JSON.parse(json) as { description: string }[]).map((t) => t.description);

describe('queryTransactionsToolDefinition', () => {
  it('describes itself with name and input schema', () => {
    expect(queryTransactionsToolDefinition.name).toBe('query_transactions');
    expect(queryTransactionsToolDefinition.inputSchema.properties).toHaveProperty('from');
    expect(queryTransactionsToolDefinition.inputSchema.properties).toHaveProperty('to');
    expect(queryTransactionsToolDefinition.inputSchema.properties).toHaveProperty(
      'descriptionContains',
    );
    expect(queryTransactionsToolDefinition.inputSchema.properties).toHaveProperty('bank');
    expect(queryTransactionsToolDefinition.inputSchema.properties).toHaveProperty('limit');
  });
});

describe('handleQueryTransactions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to the last 90 days when no date range is given', async () => {
    const repo = fakeRepo([
      tx('2026-04-20', 'recent'),
      tx('2026-01-25', 'on the 90 day boundary'),
      tx('2025-12-01', 'too old'),
    ]);

    const result = await handleQueryTransactions(repo);

    expect(descriptions(result)).toEqual(['recent', 'on the 90 day boundary']);
  });

  it('filters by from date inclusive', async () => {
    const repo = fakeRepo([
      tx('2026-03-15', 'before'),
      tx('2026-04-01', 'on boundary'),
      tx('2026-04-10', 'after'),
    ]);

    const result = await handleQueryTransactions(repo, { from: '2026-04-01' });

    expect(descriptions(result)).toEqual(['after', 'on boundary']);
  });

  it('filters by to date inclusive', async () => {
    const repo = fakeRepo([
      tx('2026-04-10', 'inside'),
      tx('2026-04-15', 'on boundary'),
      tx('2026-04-20', 'after'),
    ]);

    const result = await handleQueryTransactions(repo, {
      from: '2026-04-01',
      to: '2026-04-15',
    });

    expect(descriptions(result)).toEqual(['on boundary', 'inside']);
  });

  it('filters by descriptionContains case-insensitively', async () => {
    const repo = fakeRepo([
      tx('2026-04-10', 'Mercadona Madrid', -10),
      tx('2026-04-11', 'mercadona barcelona', -20),
      tx('2026-04-12', 'Carrefour', -30),
    ]);

    const result = await handleQueryTransactions(repo, {
      descriptionContains: 'MERCA',
    });

    expect(descriptions(result)).toEqual(['mercadona barcelona', 'Mercadona Madrid']);
  });

  it('filters by bank exact match', async () => {
    const repo = fakeRepo([
      tx('2026-04-10', 'a', 1, 'BBVA'),
      tx('2026-04-11', 'b', 2, 'SABADELL'),
      tx('2026-04-12', 'c', 3, 'BBVA'),
    ]);

    const result = await handleQueryTransactions(repo, { bank: 'BBVA' });

    expect(descriptions(result)).toEqual(['c', 'a']);
  });

  it('sorts by date descending', async () => {
    const repo = fakeRepo([
      tx('2026-04-01', 'oldest'),
      tx('2026-04-10', 'middle'),
      tx('2026-04-20', 'newest'),
    ]);

    const result = await handleQueryTransactions(repo, { from: '2026-04-01' });

    expect(descriptions(result)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('limits results to the given count', async () => {
    const repo = fakeRepo([
      tx('2026-04-01', 'a'),
      tx('2026-04-02', 'b'),
      tx('2026-04-03', 'c'),
      tx('2026-04-04', 'd'),
    ]);

    const result = await handleQueryTransactions(repo, {
      from: '2026-04-01',
      limit: 2,
    });

    expect(descriptions(result)).toEqual(['d', 'c']);
  });

  it('combines filters', async () => {
    const repo = fakeRepo([
      tx('2026-04-10', 'Mercadona Sants', -10, 'BBVA'),
      tx('2026-04-11', 'Mercadona Gracia', -20, 'SABADELL'),
      tx('2026-04-12', 'Carrefour', -30, 'BBVA'),
    ]);

    const result = await handleQueryTransactions(repo, {
      descriptionContains: 'mercadona',
      bank: 'BBVA',
    });

    expect(descriptions(result)).toEqual(['Mercadona Sants']);
  });

  it('serializes dates as ISO YYYY-MM-DD strings and includes category', async () => {
    const repo = fakeRepo([tx('2026-04-10', 'MERCADONA', -5, 'BBVA')]);

    const result = await handleQueryTransactions(repo, { from: '2026-04-01' });

    expect(JSON.parse(result)).toEqual([
      {
        date: '2026-04-10',
        description: 'MERCADONA',
        amount: -5,
        bank: 'BBVA',
        category: 'groceries',
      },
    ]);
  });
});
