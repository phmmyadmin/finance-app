import { describe, it, expect } from 'vitest';
import { generateReport } from '../../../../../src/module/report/application/generateReport.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Category } from '../../../../../src/module/cashflow/domain/Category.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { Position } from '../../../../../src/module/investments/domain/Position.js';
import type { Valuation } from '../../../../../src/module/investments/domain/Valuation.js';
import type { ValuationsRepository } from '../../../../../src/module/investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';
import type { PatrimonySnapshot } from '../../../../../src/module/patrimony/domain/PatrimonySnapshot.js';

const utc = (date: string): Date => new Date(`${date}T12:00:00.000Z`);

const tx = (
  date: string,
  amount: number,
  category: Category,
  description = 'tx',
  bank: string | null = 'SABADELL',
): Transaction => ({
  date: utc(date),
  amount,
  category,
  description,
  bank,
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

const position = (platform: string, amount: number): Position => ({
  platform,
  name: 'irrelevant',
  assetClass: 'equity',
  principal: { amount, currency: 'EUR' },
  acquiredAt: null,
});

const valuation = (platform: string, date: string, value: number): Valuation => ({
  platform,
  at: utc(date),
  value,
});

describe('generateReport', () => {
  it('computes real spending excluding transfers_self, investments, cash_withdrawal and income', async () => {
    const transactions: Transaction[] = [
      tx('2026-04-10', -100, 'groceries'),
      tx('2026-04-12', -50, 'restaurants'),
      tx('2026-04-15', -2000, 'transfers_self'), // excluded
      tx('2026-04-16', -300, 'investments'), // excluded
      tx('2026-04-18', -400, 'cash_withdrawal'), // excluded
      tx('2026-04-20', 2200, 'income'), // excluded from outflows
      tx('2026-04-25', -30, 'bizum'),
      tx('2026-04-26', 10, 'bizum'), // partial inflow → bizum net = -20
    ];
    const result = await generateReport(
      fakeCash(transactions),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      { primaryMonth: '2026-04', now: utc('2026-04-26') },
    );
    // 100 + 50 + 20 (bizum net) = 170
    expect(result.primary.realSpending).toBe(170);
    expect(result.primary.income).toBe(2200);
    expect(result.primary.transactions).toBe(8);
  });

  it('selects the latest transaction month as primary when not provided', async () => {
    const transactions: Transaction[] = [
      tx('2026-02-15', -10, 'groceries'),
      tx('2026-04-10', -100, 'groceries'),
    ];
    const result = await generateReport(
      fakeCash(transactions),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      { now: utc('2026-04-26') },
    );
    expect(result.primaryPeriod.from).toBe('2026-04-01');
    expect(result.primaryPeriod.to.startsWith('2026-04-30')).toBe(true);
  });

  it('builds a 12-month series ending at the primary month', async () => {
    const result = await generateReport(
      fakeCash([tx('2026-04-10', -100, 'groceries')]),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      { primaryMonth: '2026-04', now: utc('2026-04-26') },
    );
    expect(result.monthly).toHaveLength(12);
    expect(result.monthly[0]!.month).toBe('2025-05');
    expect(result.monthly.at(-1)!.month).toBe('2026-04');
    expect(result.monthly.at(-1)!.realSpending).toBe(100);
  });

  it('computes MoM, YoY and 12m average comparatives', async () => {
    const transactions: Transaction[] = [
      tx('2025-04-10', -200, 'groceries'), // YoY ref
      tx('2026-03-10', -300, 'groceries'), // MoM ref
      tx('2026-04-10', -600, 'groceries'), // current
    ];
    const result = await generateReport(
      fakeCash(transactions),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      { primaryMonth: '2026-04', now: utc('2026-04-26') },
    );
    expect(result.comparatives.vsPreviousMonth).toBe(1); // +100% vs 300
    expect(result.comparatives.vsSameMonthLastYear).toBe(2); // +200% vs 200
    // 12m series: 11 trailing months with one entry of 200 in 2025-04 sum=200, avg ≈ 18.18
    // Actually the trailing months are May 2025..March 2026 → only March has 300.
    // avg = 300/11 ≈ 27.27. (600 - 27.27)/27.27 ≈ 21.
    expect(result.comparatives.vsTwelveMonthAverage).not.toBeNull();
    expect(result.comparatives.ytdMonths).toBeGreaterThan(0);
  });

  it('returns top expenses excluding transfers_self / investments / cash_withdrawal', async () => {
    const transactions: Transaction[] = [
      tx('2026-04-10', -800, 'shopping', 'shopdutyfree'),
      tx('2026-04-11', -500, 'restaurants', 'fancy dinner'),
      tx('2026-04-12', -2000, 'transfers_self', 'transfer to self'), // excluded
      tx('2026-04-13', -3000, 'investments', 'urbanitae'), // excluded
      tx('2026-04-14', -1500, 'cash_withdrawal', 'atm'), // excluded
      tx('2026-04-15', -100, 'groceries', 'mercadona'),
    ];
    const result = await generateReport(
      fakeCash(transactions),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      { primaryMonth: '2026-04', now: utc('2026-04-26') },
    );
    expect(result.primary.topExpenses.map((e) => e.description)).toEqual([
      'shopdutyfree',
      'fancy dinner',
      'mercadona',
    ]);
  });

  it('aggregates portfolio with latest valuation per platform', async () => {
    const result = await generateReport(
      fakeCash([]),
      fakeInvestments([position('A', 1000), position('B', 200)]),
      fakeValuations([valuation('A', '2026-01-01', 1100), valuation('A', '2026-04-01', 1500)]),
      fakePatrimony([]),
      { primaryMonth: '2026-04', now: utc('2026-04-26') },
    );
    expect(result.portfolio.total).toBe(1700); // 1500 + 200 (fallback)
    expect(result.netWorth.investmentsPrincipal).toBe(1200);
    expect(result.netWorth.investmentsUnrealized).toBe(500);
    expect(result.netWorth.platformsMissingValuation).toEqual(['B']);
  });

  it('computes trips from input ranges', async () => {
    const transactions: Transaction[] = [
      tx('2026-01-12', -500, 'cash_withdrawal', 'cebu atm'),
      tx('2026-01-14', -50, 'restaurants', 'bbq cebu'),
      tx('2026-01-20', -200, 'shopping', 'manila mall'),
      tx('2026-02-01', -100, 'groceries', 'mercadona post-trip'), // outside window
    ];
    const result = await generateReport(
      fakeCash(transactions),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([]),
      {
        primaryMonth: '2026-01',
        now: utc('2026-02-01'),
        trips: [{ label: 'Filipinas', from: '2026-01-10', to: '2026-01-25' }],
      },
    );
    expect(result.trips).toHaveLength(1);
    const trip = result.trips[0]!;
    expect(trip.cashWithdrawn).toBe(500);
    expect(trip.cardSpend).toBe(250); // 50 + 200, cash_withdrawal excluded from cardSpend
    expect(trip.total).toBe(750);
    expect(trip.days).toBe(16);
  });

  it('produces annual comparison for the two most recent completed years', async () => {
    const transactions: Transaction[] = [
      // 2024
      tx('2024-06-10', 30000, 'income'),
      tx('2024-07-10', -10000, 'shopping'),
      // 2025
      tx('2025-06-10', 31000, 'income'),
      tx('2025-07-10', -8000, 'shopping'),
      // 2026 (current — primary)
      tx('2026-04-10', -100, 'groceries'),
    ];
    const result = await generateReport(
      fakeCash(transactions),
      fakeInvestments([]),
      fakeValuations([]),
      fakePatrimony([
        { year: 2024, patrimony: 50000, improvementPct: 0.2, improvementEur: 10000 },
        { year: 2025, patrimony: 60000, improvementPct: 0.2, improvementEur: 10000 },
      ]),
      { primaryMonth: '2026-04', now: utc('2026-04-26') },
    );
    expect(result.annual).not.toBeNull();
    expect(result.annual!.previous.year).toBe(2024);
    expect(result.annual!.current.year).toBe(2025);
    expect(result.annual!.previous.realSpending).toBe(10000);
    expect(result.annual!.current.realSpending).toBe(8000);
  });
});
