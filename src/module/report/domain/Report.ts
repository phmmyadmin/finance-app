import type { AssetClass } from '../../investments/domain/AssetClass.js';
import type { Category } from '../../cashflow/domain/Category.js';
import type { StaleSource } from '../../freshness/domain/DataFreshness.js';
import type { RecurringExpense } from '../../cashflow/domain/RecurringExpense.js';

export type Period = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

export type MonthBucket = {
  /** YYYY-MM */
  month: string;
  /** Real spending: outflows excluding transfers_self, investments, cash_withdrawal. */
  realSpending: number;
  income: number;
  byCategory: Partial<Record<Category, number>>;
  transactions: number;
};

export type CategoryAmount = {
  category: Category | 'bizum_net' | 'other';
  amount: number;
};

export type TopExpense = {
  date: string;
  description: string;
  amount: number;
  bank: string | null;
  category: Category;
};

export type BalanceByBank = Record<string, number>;

export type PortfolioSlice = {
  name: string;
  amount: number;
  share: number; // 0..1
};

export type Comparatives = {
  vsPreviousMonth: number | null; // %
  vsSameMonthLastYear: number | null; // %
  vsTwelveMonthAverage: number | null; // %
  ytdTotal: number;
  ytdMonths: number;
};

export type AnnualSummary = {
  year: number;
  income: number;
  realSpending: number;
  savingsRate: number; // 0..1
  patrimonyDelta: number | null;
};

export type CategoryYoY = {
  category: Category;
  prev: number;
  current: number;
  pct: number | null; // null when prev was 0
};

export type Trip = {
  label: string;
  from: string;
  to: string;
  days: number;
  total: number;
  cashWithdrawn: number;
  cardSpend: number;
  perDay: number;
  byCategory: Partial<Record<Category, number>>;
  topMerchant: { description: string; amount: number } | null;
};

export type ReportData = {
  generatedAt: string; // ISO instant
  primaryPeriod: Period; // the focus month
  // KPIs
  netWorth: {
    cash: number;
    investments: number;
    total: number;
    lastPatrimony: { year: number; value: number } | null;
    deltaSinceLastPatrimony: number | null;
    investmentsPrincipal: number;
    investmentsUnrealized: number;
    investmentsUnrealizedPct: number | null;
    platformsMissingValuation: string[];
  };
  balanceByBank: BalanceByBank;
  // Primary period detail
  primary: {
    realSpending: number;
    income: number;
    transactions: number;
    byCategory: Partial<Record<Category, number>>;
    topExpenses: TopExpense[];
  };
  // 12-month series ending in primary period
  monthly: MonthBucket[];
  // Comparatives for primary period
  comparatives: Comparatives;
  // Investments
  portfolio: {
    total: number;
    byPlatform: PortfolioSlice[];
    byAssetClass: Array<{ assetClass: AssetClass; amount: number; share: number }>;
  };
  // Patrimony
  patrimony: Array<{ year: number; patrimony: number; improvementEur: number }>;
  // Annual comparison (most recent two completed years)
  annual: { previous: AnnualSummary; current: AnnualSummary; categories: CategoryYoY[] } | null;
  // Recurring
  recurring: RecurringExpense[];
  // Travel
  trips: Trip[];
  // Freshness
  freshness: StaleSource[];
};
