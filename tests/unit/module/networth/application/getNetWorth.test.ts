import { describe, it, expect } from 'vitest';
import { getNetWorth } from '../../../../../src/module/networth/application/getNetWorth.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { Position } from '../../../../../src/module/investments/domain/Position.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';
import type { PatrimonySnapshot } from '../../../../../src/module/patrimony/domain/PatrimonySnapshot.js';

const tx = (amount: number): Transaction => ({
  date: new Date(Date.UTC(2024, 0, 1)),
  description: 'irrelevant',
  amount,
  bank: 'BBVA',
});

const position = (amount: number): Position => ({
  platform: 'X',
  name: 'irrelevant',
  assetClass: 'equity',
  principal: { amount, currency: 'EUR' },
  acquiredAt: null,
});

const fakeCash = (transactions: Transaction[]): CashflowRepository => ({
  listAll: async () => transactions,
  appendMany: async () => {},
});

const fakeInvestments = (positions: Position[]): InvestmentsRepository => ({
  listAll: async () => positions,
});

const fakePatrimony = (snapshots: PatrimonySnapshot[]): PatrimonyRepository => ({
  listAll: async () => snapshots,
});

describe('getNetWorth', () => {
  it('aggregates cash + investments principal + last patrimony', async () => {
    const result = await getNetWorth(
      fakeCash([tx(1000), tx(-200), tx(500)]),
      fakeInvestments([position(2000), position(3000)]),
      fakePatrimony([
        { year: 2023, patrimony: 30000, improvementPct: 0, improvementEur: 0 },
        { year: 2025, patrimony: 50000, improvementPct: 0.1, improvementEur: 5000 },
        { year: 2024, patrimony: 40000, improvementPct: 0.05, improvementEur: 2000 },
      ]),
    );

    expect(result).toEqual({
      cash: 1300,
      investmentsPrincipal: 5000,
      computedTotal: 6300,
      lastPatrimony: { year: 2025, value: 50000 },
      deltaSinceLastPatrimony: -43700,
    });
  });

  it('omits patrimony fields when there is no history', async () => {
    const result = await getNetWorth(fakeCash([tx(100)]), fakeInvestments([]), fakePatrimony([]));

    expect(result).toEqual({
      cash: 100,
      investmentsPrincipal: 0,
      computedTotal: 100,
    });
    expect(result.lastPatrimony).toBeUndefined();
    expect(result.deltaSinceLastPatrimony).toBeUndefined();
  });

  it('rounds aggregates to 2 decimals', async () => {
    const result = await getNetWorth(
      fakeCash([tx(0.1), tx(0.2)]),
      fakeInvestments([position(0.3)]),
      fakePatrimony([]),
    );

    expect(result.cash).toBe(0.3);
    expect(result.investmentsPrincipal).toBe(0.3);
    expect(result.computedTotal).toBe(0.6);
  });
});
