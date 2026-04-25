import { describe, it, expect } from 'vitest';
import { getNetWorth } from '../../../../../src/module/networth/application/getNetWorth.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { Position } from '../../../../../src/module/investments/domain/Position.js';
import type { Valuation } from '../../../../../src/module/investments/domain/Valuation.js';
import type { ValuationsRepository } from '../../../../../src/module/investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';
import type { PatrimonySnapshot } from '../../../../../src/module/patrimony/domain/PatrimonySnapshot.js';

const tx = (amount: number): Transaction => ({
  date: new Date(Date.UTC(2024, 0, 1)),
  description: 'irrelevant',
  amount,
  bank: 'BBVA',
  category: 'uncategorized',
});

const position = (platform: string, amount: number): Position => ({
  platform,
  name: 'irrelevant',
  assetClass: 'equity',
  principal: { amount, currency: 'EUR' },
  acquiredAt: null,
});

const v = (platform: string, date: string, value: number): Valuation => ({
  platform,
  at: new Date(`${date}T00:00:00.000Z`),
  value,
});

const fakeCash = (transactions: Transaction[]): CashflowRepository => ({
  listAll: async () => transactions,
  appendMany: async () => {},
});

const fakeInvestments = (positions: Position[]): InvestmentsRepository => ({
  listAll: async () => positions,
});

const fakeValuations = (valuations: Valuation[]): ValuationsRepository => ({
  listAll: async () => valuations,
  appendOne: async () => {},
});

const fakePatrimony = (snapshots: PatrimonySnapshot[]): PatrimonyRepository => ({
  listAll: async () => snapshots,
});

describe('getNetWorth', () => {
  it('uses the latest valuation per platform when available', async () => {
    const result = await getNetWorth(
      fakeCash([tx(1000)]),
      fakeInvestments([position('MyInvestor', 30000), position('Mintos', 200)]),
      fakeValuations([
        v('MyInvestor', '2026-01-01', 35000),
        v('MyInvestor', '2026-04-01', 47500),
        v('Mintos', '2026-04-01', 250),
      ]),
      fakePatrimony([]),
    );

    expect(result.cash).toBe(1000);
    expect(result.investments).toBe(47750); // 47500 + 250 (latest valuations)
    expect(result.computedTotal).toBe(48750);
    expect(result.platformsMissingValuation).toBeUndefined();
  });

  it('falls back to principal for platforms without valuations and reports them', async () => {
    const result = await getNetWorth(
      fakeCash([tx(0)]),
      fakeInvestments([
        position('MyInvestor', 30000),
        position('Urbanitae', 2500),
        position('Mintos', 200),
      ]),
      fakeValuations([v('MyInvestor', '2026-04-01', 35000)]),
      fakePatrimony([]),
    );

    // MyInvestor uses valuation (35000); Urbanitae + Mintos fall back to principal (2500 + 200).
    expect(result.investments).toBe(37700);
    expect(result.platformsMissingValuation).toEqual(['Mintos', 'Urbanitae']);
  });

  it('includes valuations for platforms with no recorded position', async () => {
    const result = await getNetWorth(
      fakeCash([]),
      fakeInvestments([]),
      fakeValuations([v('NewPlatform', '2026-04-01', 1000)]),
      fakePatrimony([]),
    );

    expect(result.investments).toBe(1000);
    expect(result.platformsMissingValuation).toBeUndefined();
  });

  it('reports zero investments when there are no positions or valuations', async () => {
    const result = await getNetWorth(
      fakeCash([tx(100)]),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
    );

    expect(result.cash).toBe(100);
    expect(result.investments).toBe(0);
    expect(result.computedTotal).toBe(100);
    expect(result.platformsMissingValuation).toBeUndefined();
  });

  it('still reports last patrimony and delta', async () => {
    const result = await getNetWorth(
      fakeCash([tx(1000)]),
      fakeInvestments([position('A', 1000)]),
      fakeValuations([v('A', '2026-04-01', 1500)]),
      fakePatrimony([
        { year: 2024, patrimony: 1000, improvementPct: 0, improvementEur: 0 },
        { year: 2025, patrimony: 2000, improvementPct: 1, improvementEur: 1000 },
      ]),
    );

    expect(result.lastPatrimony).toEqual({ year: 2025, value: 2000 });
    expect(result.deltaSinceLastPatrimony).toBe(500); // (1000 + 1500) - 2000
  });
});
