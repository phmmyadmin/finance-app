import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { Category } from '../../cashflow/domain/Category.js';
import type { Transaction } from '../../cashflow/domain/Transaction.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { Position } from '../../investments/domain/Position.js';
import type { Valuation } from '../../investments/domain/Valuation.js';
import type { ValuationsRepository } from '../../investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import { detectRecurringExpenses } from '../../cashflow/application/detectRecurringExpenses.js';
import { getDataFreshness } from '../../freshness/application/getDataFreshness.js';
import type {
  AnnualSummary,
  CategoryYoY,
  Comparatives,
  MonthBucket,
  Period,
  PortfolioSlice,
  ReportData,
  TopExpense,
  Trip,
} from '../domain/Report.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

const EXCLUDED_FROM_REAL_SPENDING: ReadonlySet<Category> = new Set<Category>([
  'transfers_self',
  'investments',
  'cash_withdrawal',
  'income',
]);

const EXCLUDED_FROM_TOP_EXPENSES: ReadonlySet<Category> = new Set<Category>([
  'transfers_self',
  'investments',
  'cash_withdrawal',
]);

const TOP_EXPENSE_LIMIT = 5;
const TOP_RECURRING_LIMIT = 12;

export type TripInput = {
  label: string;
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
};

export type GenerateReportOptions = {
  /** Focus month in YYYY-MM. Defaults to the month of the latest transaction. */
  primaryMonth?: string;
  /** Trip windows to highlight. */
  trips?: TripInput[];
  /** Override "now" (used by tests + freshness). */
  now?: Date;
};

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function ymKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function startOfMonth(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1));
}

function endOfMonth(year: number, monthIndex0: number): Date {
  // Last instant of the month: day 0 of next month minus 1ms.
  return new Date(Date.UTC(year, monthIndex0 + 1, 1) - 1);
}

function periodForMonth(ym: string): Period {
  const [yStr, mStr] = ym.split('-');
  const year = Number(yStr);
  const monthIndex0 = Number(mStr) - 1;
  return {
    from: isoDate(startOfMonth(year, monthIndex0)),
    to: isoDate(endOfMonth(year, monthIndex0)),
  };
}

function shiftMonths(ym: string, deltaMonths: number): string {
  const [yStr, mStr] = ym.split('-');
  const year = Number(yStr);
  const monthIndex0 = Number(mStr) - 1 + deltaMonths;
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  return ymKey(d);
}

function bucketByMonth(
  transactions: Transaction[],
  fromMonth: string,
  toMonth: string,
): MonthBucket[] {
  const order: string[] = [];
  let cursor = fromMonth;
  while (cursor <= toMonth) {
    order.push(cursor);
    cursor = shiftMonths(cursor, 1);
    if (order.length > 60) break; // safety
  }

  const buckets = new Map<string, MonthBucket>();
  for (const ym of order) {
    buckets.set(ym, {
      month: ym,
      realSpending: 0,
      income: 0,
      byCategory: {},
      transactions: 0,
    });
  }

  for (const t of transactions) {
    const ym = ymKey(t.date);
    const bucket = buckets.get(ym);
    if (!bucket) continue;
    bucket.byCategory[t.category] = (bucket.byCategory[t.category] ?? 0) + t.amount;
    bucket.transactions += 1;
  }

  for (const bucket of buckets.values()) {
    let real = 0;
    for (const [cat, amount] of Object.entries(bucket.byCategory) as Array<[Category, number]>) {
      if (EXCLUDED_FROM_REAL_SPENDING.has(cat)) continue;
      if (amount < 0) real += -amount;
    }
    bucket.realSpending = round2(real);
    bucket.income = round2(bucket.byCategory.income ?? 0);
    for (const k of Object.keys(bucket.byCategory) as Category[]) {
      bucket.byCategory[k] = round2(bucket.byCategory[k]!);
    }
  }

  return order.map((ym) => buckets.get(ym)!);
}

function topExpensesIn(
  transactions: Transaction[],
  from: Date,
  to: Date,
  limit: number,
): TopExpense[] {
  return transactions
    .filter((t) => t.date >= from && t.date <= to)
    .filter((t) => t.amount < 0 && !EXCLUDED_FROM_TOP_EXPENSES.has(t.category))
    .sort((a, b) => a.amount - b.amount)
    .slice(0, limit)
    .map((t) => ({
      date: isoDate(t.date),
      description: t.description,
      amount: round2(t.amount),
      bank: t.bank,
      category: t.category,
    }));
}

function balanceByBank(transactions: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.bank) continue;
    map[t.bank] = (map[t.bank] ?? 0) + t.amount;
  }
  for (const k of Object.keys(map)) map[k] = round2(map[k]!);
  return map;
}

function buildPortfolio(
  positions: Position[],
  valuations: Valuation[],
): {
  total: number;
  byPlatform: PortfolioSlice[];
  byAssetClass: ReportData['portfolio']['byAssetClass'];
  principal: number;
} {
  const principalByPlatform = new Map<string, number>();
  const assetByPlatform = new Map<string, Map<string, number>>();
  for (const p of positions) {
    principalByPlatform.set(
      p.platform,
      (principalByPlatform.get(p.platform) ?? 0) + p.principal.amount,
    );
    const m = assetByPlatform.get(p.platform) ?? new Map<string, number>();
    m.set(p.assetClass, (m.get(p.assetClass) ?? 0) + p.principal.amount);
    assetByPlatform.set(p.platform, m);
  }

  const latestValuation = new Map<string, number>();
  const latestAt = new Map<string, number>();
  for (const v of valuations) {
    const t = v.at.getTime();
    const previous = latestAt.get(v.platform);
    if (previous === undefined || t > previous) {
      latestAt.set(v.platform, t);
      latestValuation.set(v.platform, v.value);
    }
  }

  const platforms = new Set<string>([...principalByPlatform.keys(), ...latestValuation.keys()]);

  let total = 0;
  let principal = 0;
  const valueByPlatform = new Map<string, number>();
  for (const p of platforms) {
    const value = latestValuation.get(p) ?? principalByPlatform.get(p) ?? 0;
    valueByPlatform.set(p, value);
    total += value;
    principal += principalByPlatform.get(p) ?? 0;
  }

  const byPlatform: PortfolioSlice[] = [...valueByPlatform.entries()]
    .map(([name, amount]) => ({
      name,
      amount: round2(amount),
      share: total > 0 ? round4(amount / total) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Asset class allocation, scaled by current value when valuation > principal.
  const byAssetClassMap = new Map<string, number>();
  for (const [platform, classMap] of assetByPlatform) {
    const principalSum = [...classMap.values()].reduce((a, b) => a + b, 0);
    const value = valueByPlatform.get(platform) ?? 0;
    const scale = principalSum > 0 ? value / principalSum : 0;
    for (const [cls, amount] of classMap) {
      byAssetClassMap.set(cls, (byAssetClassMap.get(cls) ?? 0) + amount * scale);
    }
  }
  const byAssetClass = [...byAssetClassMap.entries()]
    .map(([assetClass, amount]) => ({
      assetClass: assetClass as ReportData['portfolio']['byAssetClass'][number]['assetClass'],
      amount: round2(amount),
      share: total > 0 ? round4(amount / total) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total: round2(total), byPlatform, byAssetClass, principal: round2(principal) };
}

function annualSummary(
  transactions: Transaction[],
  year: number,
  patrimonyDelta: number | null,
): AnnualSummary {
  const from = startOfMonth(year, 0);
  const to = endOfMonth(year, 11);
  const byCategory: Partial<Record<Category, number>> = {};
  for (const t of transactions) {
    if (t.date < from || t.date > to) continue;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  const income = byCategory.income ?? 0;
  let realSpending = 0;
  for (const [cat, amount] of Object.entries(byCategory) as Array<[Category, number]>) {
    if (EXCLUDED_FROM_REAL_SPENDING.has(cat)) continue;
    if (amount < 0) realSpending += -amount;
  }
  const savingsRate = income > 0 ? (income - realSpending) / income : 0;
  return {
    year,
    income: round2(income),
    realSpending: round2(realSpending),
    savingsRate: round4(savingsRate),
    patrimonyDelta: patrimonyDelta === null ? null : round2(patrimonyDelta),
  };
}

function categoryYoY(
  transactions: Transaction[],
  prevYear: number,
  curYear: number,
): CategoryYoY[] {
  const sumYear = (year: number): Map<Category, number> => {
    const from = startOfMonth(year, 0);
    const to = endOfMonth(year, 11);
    const map = new Map<Category, number>();
    for (const t of transactions) {
      if (t.date < from || t.date > to) continue;
      // Only outflows for this comparison.
      if (t.amount >= 0) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + -t.amount);
    }
    return map;
  };
  const prev = sumYear(prevYear);
  const cur = sumYear(curYear);
  const cats = new Set<Category>([...prev.keys(), ...cur.keys()]);
  const rows: CategoryYoY[] = [];
  for (const cat of cats) {
    const p = prev.get(cat) ?? 0;
    const c = cur.get(cat) ?? 0;
    const pct = p === 0 ? null : round4((c - p) / p);
    rows.push({ category: cat, prev: round2(p), current: round2(c), pct });
  }
  rows.sort((a, b) => b.current - a.current);
  return rows;
}

function buildTrip(transactions: Transaction[], input: TripInput): Trip {
  const from = parseIsoDate(input.from);
  const to = parseIsoDate(input.to);
  const inWindow = transactions.filter(
    (t) => t.date >= from && t.date <= new Date(to.getTime() + 86_400_000 - 1),
  );
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);

  const byCategory: Partial<Record<Category, number>> = {};
  let cashWithdrawn = 0;
  let cardSpend = 0;
  let topMerchant: { description: string; amount: number } | null = null;
  for (const t of inWindow) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    if (t.category === 'cash_withdrawal' && t.amount < 0) cashWithdrawn += -t.amount;
    if (t.amount < 0 && !EXCLUDED_FROM_TOP_EXPENSES.has(t.category)) cardSpend += -t.amount;
    if (
      t.amount < 0 &&
      t.category !== 'transfers_self' &&
      t.category !== 'investments' &&
      (topMerchant === null || t.amount < topMerchant.amount)
    ) {
      topMerchant = { description: t.description, amount: round2(t.amount) };
    }
  }
  for (const k of Object.keys(byCategory) as Category[]) {
    byCategory[k] = round2(byCategory[k]!);
  }
  const total = cashWithdrawn + cardSpend;
  return {
    label: input.label,
    from: input.from,
    to: input.to,
    days,
    total: round2(total),
    cashWithdrawn: round2(cashWithdrawn),
    cardSpend: round2(cardSpend),
    perDay: round2(total / days),
    byCategory,
    topMerchant,
  };
}

export async function generateReport(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  valuations: ValuationsRepository,
  patrimony: PatrimonyRepository,
  options: GenerateReportOptions = {},
): Promise<ReportData> {
  const now = options.now ?? new Date();
  const [transactions, positions, valuationList, snapshots] = await Promise.all([
    cashflow.listAll(),
    investments.listAll(),
    valuations.listAll(),
    patrimony.listAll(),
  ]);

  // Choose primary month
  const latestTxDate = transactions.reduce<Date | null>(
    (best, t) => (best === null || t.date > best ? t.date : best),
    null,
  );
  const primaryMonth = options.primaryMonth ?? (latestTxDate ? ymKey(latestTxDate) : ymKey(now));
  const primaryPeriod = periodForMonth(primaryMonth);
  const primaryFrom = parseIsoDate(primaryPeriod.from);
  const primaryTo = parseIsoDate(primaryPeriod.to);

  // Net worth
  const cash = transactions.reduce((acc, t) => acc + t.amount, 0);
  const portfolio = buildPortfolio(positions, valuationList);
  const investmentsValue = portfolio.total;
  const total = cash + investmentsValue;
  const lastSnap = snapshots.reduce<{ year: number; value: number } | null>(
    (best, s) =>
      best === null || s.year > best.year ? { year: s.year, value: s.patrimony } : best,
    null,
  );
  const principalByPlatform = new Map<string, number>();
  for (const p of positions)
    principalByPlatform.set(
      p.platform,
      (principalByPlatform.get(p.platform) ?? 0) + p.principal.amount,
    );
  const valuedPlatforms = new Set(valuationList.map((v) => v.platform));
  const platformsMissingValuation = [...principalByPlatform.keys()]
    .filter((p) => !valuedPlatforms.has(p))
    .sort();

  const investmentsUnrealized = investmentsValue - portfolio.principal;
  const investmentsUnrealizedPct =
    portfolio.principal > 0 ? round4(investmentsUnrealized / portfolio.principal) : null;

  // Primary period detail
  const inPrimary = transactions.filter((t) => t.date >= primaryFrom && t.date <= primaryTo);
  const primaryByCategory: Partial<Record<Category, number>> = {};
  for (const t of inPrimary) {
    primaryByCategory[t.category] = (primaryByCategory[t.category] ?? 0) + t.amount;
  }
  for (const k of Object.keys(primaryByCategory) as Category[]) {
    primaryByCategory[k] = round2(primaryByCategory[k]!);
  }
  let primaryRealSpending = 0;
  for (const [cat, amount] of Object.entries(primaryByCategory) as Array<[Category, number]>) {
    if (EXCLUDED_FROM_REAL_SPENDING.has(cat)) continue;
    if (amount < 0) primaryRealSpending += -amount;
  }
  const primaryIncome = primaryByCategory.income ?? 0;
  const topExpenses = topExpensesIn(transactions, primaryFrom, primaryTo, TOP_EXPENSE_LIMIT);

  // 12-month series ending at primary month
  const seriesStart = shiftMonths(primaryMonth, -11);
  const monthly = bucketByMonth(transactions, seriesStart, primaryMonth);

  // Comparatives
  const currentBucket = monthly.at(-1)!;
  const previousBucket = monthly.length >= 2 ? monthly.at(-2)! : null;
  const yoyMonth = shiftMonths(primaryMonth, -12);
  const yoyBuckets = bucketByMonth(transactions, yoyMonth, yoyMonth);
  const yoyBucket = yoyBuckets[0] ?? null;
  const trailing = monthly.slice(0, -1);
  const trailingAvg =
    trailing.length > 0 ? trailing.reduce((s, b) => s + b.realSpending, 0) / trailing.length : 0;
  const ytdMonths = monthly.filter((b) => b.month.startsWith(primaryMonth.slice(0, 4)));
  const ytdTotal = ytdMonths.reduce((s, b) => s + b.realSpending, 0);

  const safePct = (cur: number, ref: number): number | null =>
    ref > 0 ? round4((cur - ref) / ref) : null;

  const comparatives: Comparatives = {
    vsPreviousMonth: previousBucket
      ? safePct(currentBucket.realSpending, previousBucket.realSpending)
      : null,
    vsSameMonthLastYear: yoyBucket
      ? safePct(currentBucket.realSpending, yoyBucket.realSpending)
      : null,
    vsTwelveMonthAverage: safePct(currentBucket.realSpending, trailingAvg),
    ytdTotal: round2(ytdTotal),
    ytdMonths: ytdMonths.length,
  };

  // Annual comparison: most recent two completed years (year < primaryYear)
  const primaryYear = Number(primaryMonth.slice(0, 4));
  const completedYears = new Set<number>();
  for (const t of transactions) {
    const y = t.date.getUTCFullYear();
    if (y < primaryYear) completedYears.add(y);
  }
  const sortedYears = [...completedYears].sort((a, b) => a - b);
  let annual: ReportData['annual'] = null;
  if (sortedYears.length >= 2) {
    const prevYear = sortedYears.at(-2)!;
    const curYear = sortedYears.at(-1)!;
    const prevSnap = snapshots.find((s) => s.year === prevYear);
    const curSnap = snapshots.find((s) => s.year === curYear);
    annual = {
      previous: annualSummary(transactions, prevYear, prevSnap?.improvementEur ?? null),
      current: annualSummary(transactions, curYear, curSnap?.improvementEur ?? null),
      categories: categoryYoY(transactions, prevYear, curYear),
    };
  }

  // Recurring
  const recurring = detectRecurringExpenses(transactions, { now }).slice(0, TOP_RECURRING_LIMIT);

  // Trips
  const trips: Trip[] = (options.trips ?? []).map((t) => buildTrip(transactions, t));

  // Freshness
  const freshness = await getDataFreshness(cashflow, investments, valuations, patrimony, now);

  return {
    generatedAt: now.toISOString(),
    primaryPeriod,
    netWorth: {
      cash: round2(cash),
      investments: round2(investmentsValue),
      total: round2(total),
      lastPatrimony: lastSnap,
      deltaSinceLastPatrimony: lastSnap ? round2(total - lastSnap.value) : null,
      investmentsPrincipal: portfolio.principal,
      investmentsUnrealized: round2(investmentsUnrealized),
      investmentsUnrealizedPct,
      platformsMissingValuation,
    },
    balanceByBank: balanceByBank(transactions),
    primary: {
      realSpending: round2(primaryRealSpending),
      income: round2(primaryIncome),
      transactions: inPrimary.length,
      byCategory: primaryByCategory,
      topExpenses,
    },
    monthly,
    comparatives,
    portfolio: {
      total: portfolio.total,
      byPlatform: portfolio.byPlatform,
      byAssetClass: portfolio.byAssetClass,
    },
    patrimony: snapshots
      .map((s) => ({ year: s.year, patrimony: s.patrimony, improvementEur: s.improvementEur }))
      .sort((a, b) => a.year - b.year),
    annual,
    recurring,
    trips,
    freshness,
  };
}
