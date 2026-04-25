import { describe, it, expect } from 'vitest';
import {
  getNetWorthToolDefinition,
  handleGetNetWorth,
} from '../../../../../src/module/networth/mcp/getNetWorthTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';

const cashRepo: CashflowRepository = {
  listAll: async () => [
    { date: new Date(), description: '', amount: 100, bank: 'BBVA' },
    { date: new Date(), description: '', amount: 50, bank: 'BBVA' },
  ],
  appendMany: async () => {},
};
const investmentsRepo: InvestmentsRepository = {
  listAll: async () => [
    {
      platform: 'X',
      name: 'p',
      assetClass: 'equity',
      principal: { amount: 200, currency: 'EUR' },
      acquiredAt: null,
    },
  ],
};
const patrimonyRepo: PatrimonyRepository = {
  listAll: async () => [{ year: 2025, patrimony: 300, improvementPct: 0, improvementEur: 0 }],
};

describe('getNetWorthToolDefinition', () => {
  it('describes itself', () => {
    expect(getNetWorthToolDefinition.name).toBe('get_net_worth');
  });
});

describe('handleGetNetWorth', () => {
  it('returns combined net worth as JSON', async () => {
    const result = JSON.parse(await handleGetNetWorth(cashRepo, investmentsRepo, patrimonyRepo));

    expect(result).toEqual({
      cash: 150,
      investmentsPrincipal: 200,
      computedTotal: 350,
      lastPatrimony: { year: 2025, value: 300 },
      deltaSinceLastPatrimony: 50,
    });
  });
});
