import { describe, it, expect } from 'vitest';
import {
  getNetWorthToolDefinition,
  handleGetNetWorth,
} from '../../../../../src/module/networth/mcp/getNetWorthTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { ValuationsRepository } from '../../../../../src/module/investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';

const cashRepo: CashflowRepository = {
  listAll: async () => [
    { date: new Date(), description: '', amount: 100, bank: 'BBVA', category: 'uncategorized' },
    { date: new Date(), description: '', amount: 50, bank: 'BBVA', category: 'uncategorized' },
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
const valuationsRepo: ValuationsRepository = {
  listAll: async () => [{ platform: 'X', at: new Date(Date.UTC(2026, 3, 1)), value: 250 }],
  appendOne: async () => {},
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
  it('returns combined net worth using valuations as JSON', async () => {
    const result = JSON.parse(
      await handleGetNetWorth(cashRepo, investmentsRepo, valuationsRepo, patrimonyRepo),
    );

    expect(result).toEqual({
      cash: 150,
      investments: 250,
      computedTotal: 400,
      lastPatrimony: { year: 2025, value: 300 },
      deltaSinceLastPatrimony: 100,
    });
  });
});
