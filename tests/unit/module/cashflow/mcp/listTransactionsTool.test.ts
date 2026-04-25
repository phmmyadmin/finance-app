import { describe, it, expect } from 'vitest';
import {
  handleListTransactions,
  listTransactionsToolDefinition,
} from '../../../../../src/module/cashflow/mcp/listTransactionsTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';

const fakeRepo = (
  transactions: Awaited<ReturnType<CashflowRepository['listAll']>>,
): CashflowRepository => ({
  listAll: async () => transactions,
});

describe('listTransactionsToolDefinition', () => {
  it('describes itself with name and input schema', () => {
    expect(listTransactionsToolDefinition.name).toBe('list_transactions');
    expect(listTransactionsToolDefinition.description).toMatch(/transactions/i);
    expect(listTransactionsToolDefinition.inputSchema).toEqual({
      type: 'object',
      properties: {},
    });
  });
});

describe('handleListTransactions', () => {
  it('serializes transactions to JSON with ISO date strings', async () => {
    const repo = fakeRepo([
      {
        date: new Date(Date.UTC(2024, 0, 1)),
        description: 'Coffee',
        amount: -3.5,
        bank: 'BBVA',
      },
      {
        date: new Date(Date.UTC(2024, 1, 10)),
        description: 'Salary',
        amount: 1500,
        bank: null,
      },
    ]);

    const result = await handleListTransactions(repo);

    expect(JSON.parse(result)).toEqual([
      { date: '2024-01-01', description: 'Coffee', amount: -3.5, bank: 'BBVA' },
      { date: '2024-02-10', description: 'Salary', amount: 1500, bank: null },
    ]);
  });

  it('returns empty array string when repo has no transactions', async () => {
    const repo = fakeRepo([]);
    const result = await handleListTransactions(repo);
    expect(JSON.parse(result)).toEqual([]);
  });
});
