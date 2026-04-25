import { describe, it, expect } from 'vitest';
import {
  balanceByBankToolDefinition,
  handleGetBalanceByBank,
} from '../../../../../src/module/cashflow/mcp/balanceByBankTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const fakeRepo = (transactions: Transaction[]): CashflowRepository => ({
  listAll: async () => transactions,
  appendMany: async () => {
    throw new Error('appendMany not used in this test');
  },
});

const tx = (amount: number, bank: string | null): Transaction => ({
  date: new Date(Date.UTC(2024, 0, 1)),
  description: 'irrelevant',
  amount,
  bank,
});

describe('balanceByBankToolDefinition', () => {
  it('describes itself with name and input schema', () => {
    expect(balanceByBankToolDefinition.name).toBe('get_balance_by_bank');
    expect(balanceByBankToolDefinition.description).toMatch(/balance/i);
  });
});

describe('handleGetBalanceByBank', () => {
  it('aggregates amounts grouped by bank', async () => {
    const repo = fakeRepo([tx(100, 'BBVA'), tx(-30, 'BBVA'), tx(50, 'SABADELL')]);

    const result = await handleGetBalanceByBank(repo);

    expect(JSON.parse(result)).toEqual({ BBVA: 70, SABADELL: 50 });
  });

  it('groups transactions with null bank under "(no bank)"', async () => {
    const repo = fakeRepo([tx(10, null), tx(-3, null), tx(5, 'BBVA')]);

    expect(JSON.parse(await handleGetBalanceByBank(repo))).toEqual({
      '(no bank)': 7,
      BBVA: 5,
    });
  });

  it('rounds amounts to 2 decimals to avoid float artifacts', async () => {
    const repo = fakeRepo([tx(0.1, 'X'), tx(0.2, 'X')]);

    expect(JSON.parse(await handleGetBalanceByBank(repo))).toEqual({ X: 0.3 });
  });

  it('returns an empty object when there are no transactions', async () => {
    const repo = fakeRepo([]);
    expect(JSON.parse(await handleGetBalanceByBank(repo))).toEqual({});
  });
});
