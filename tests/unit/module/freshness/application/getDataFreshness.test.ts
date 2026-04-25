import { describe, it, expect } from 'vitest';
import { getDataFreshness } from '../../../../../src/module/freshness/application/getDataFreshness.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { Position } from '../../../../../src/module/investments/domain/Position.js';
import type { Valuation } from '../../../../../src/module/investments/domain/Valuation.js';
import type { ValuationsRepository } from '../../../../../src/module/investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';
import type { PatrimonySnapshot } from '../../../../../src/module/patrimony/domain/PatrimonySnapshot.js';

const NOW = new Date('2026-04-25T12:00:00Z');

const tx = (date: string, bank: string | null): Transaction => ({
  date: new Date(`${date}T00:00:00.000Z`),
  description: 'irrelevant',
  amount: -10,
  bank,
  category: 'uncategorized',
});

const position = (platform: string): Position => ({
  platform,
  name: 'irrelevant',
  assetClass: 'equity',
  principal: { amount: 100, currency: 'EUR' },
  acquiredAt: null,
});

const valuation = (platform: string, date: string): Valuation => ({
  platform,
  at: new Date(`${date}T00:00:00.000Z`),
  value: 100,
});

const fakeCash = (transactions: Transaction[]): CashflowRepository => ({
  listAll: async () => transactions,
  appendMany: async () => {},
});
const fakeInvestments = (positions: Position[]): InvestmentsRepository => ({
  listAll: async () => positions,
});
const fakeValuations = (vals: Valuation[]): ValuationsRepository => ({
  listAll: async () => vals,
  appendOne: async () => {},
});
const fakePatrimony = (snapshots: PatrimonySnapshot[]): PatrimonyRepository => ({
  listAll: async () => snapshots,
});

describe('getDataFreshness', () => {
  it('reports days since last transaction per bank', async () => {
    const result = await getDataFreshness(
      fakeCash([
        tx('2026-04-20', 'BBVA'), // 5 days ago
        tx('2026-04-15', 'BBVA'),
        tx('2026-04-23', 'SABADELL'), // 2 days ago
      ]),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      NOW,
    );

    expect(result).toContainEqual({
      source: 'Cash (BBVA)',
      lastUpdate: '2026-04-20',
      daysSince: 5,
    });
    expect(result).toContainEqual({
      source: 'Cash (SABADELL)',
      lastUpdate: '2026-04-23',
      daysSince: 2,
    });
  });

  it('reports last valuation per investment platform', async () => {
    const result = await getDataFreshness(
      fakeCash([]),
      fakeInvestments([position('MyInvestor'), position('Mintos')]),
      fakeValuations([
        valuation('MyInvestor', '2026-04-20'), // 5 days ago
        valuation('MyInvestor', '2026-01-01'),
      ]),
      fakePatrimony([]),
      NOW,
    );

    expect(result).toContainEqual({
      source: 'Valuation (MyInvestor)',
      lastUpdate: '2026-04-20',
      daysSince: 5,
    });
    expect(result).toContainEqual({
      source: 'Valuation (Mintos)',
      lastUpdate: null,
      daysSince: null,
    });
  });

  it('includes platforms that only appear in valuations (no positions)', async () => {
    const result = await getDataFreshness(
      fakeCash([]),
      fakeInvestments([]),
      fakeValuations([valuation('NewPlatform', '2026-04-20')]),
      fakePatrimony([]),
      NOW,
    );

    expect(result).toContainEqual({
      source: 'Valuation (NewPlatform)',
      lastUpdate: '2026-04-20',
      daysSince: 5,
    });
  });

  it('reports patrimony freshness in days too', async () => {
    const result = await getDataFreshness(
      fakeCash([]),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([
        { year: 2024, patrimony: 1000, improvementPct: 0, improvementEur: 0 },
        { year: 2025, patrimony: 2000, improvementPct: 1, improvementEur: 1000 },
      ]),
      NOW,
    );

    // Latest patrimony snapshot is 2025 → as a day proxy use Dec 31 of that year.
    // From 2025-12-31 to 2026-04-25 = 115 days.
    expect(result).toContainEqual({
      source: 'Patrimony',
      lastUpdate: '2025-12-31',
      daysSince: 115,
    });
  });

  it('sorts items oldest first (most stale at the top)', async () => {
    const result = await getDataFreshness(
      fakeCash([tx('2026-04-23', 'BBVA')]), // 2 days
      fakeInvestments([position('Mintos')]),
      fakeValuations([
        valuation('Mintos', '2026-01-01'), // 114 days
      ]),
      fakePatrimony([
        { year: 2024, patrimony: 1, improvementPct: 0, improvementEur: 0 }, // 480 days
      ]),
      NOW,
    );

    // Patrimony (2024 → 2024-12-31 → ~480 days) should be first;
    // BBVA (2 days) last among items with a date.
    const sources = result.map((r) => r.source);
    expect(sources[0]).toBe('Patrimony');
    expect(sources[sources.length - 1]).toBe('Cash (BBVA)');
  });

  it('returns an empty array when there is no data at all', async () => {
    const result = await getDataFreshness(
      fakeCash([]),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      NOW,
    );

    expect(result).toEqual([]);
  });
});
