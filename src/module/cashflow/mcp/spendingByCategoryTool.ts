import type { CashflowRepository } from '../domain/CashflowRepository.js';
import type { Category } from '../domain/Category.js';

const DEFAULT_RANGE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export type SpendingByCategoryArgs = {
  from?: string;
  to?: string;
};

export const spendingByCategoryToolDefinition = {
  name: 'get_spending_by_category',
  description:
    'Aggregate cash flow transactions by inferred category for a date range. ' +
    'Returns sums per category (signed: negative = outflow, positive = inflow). ' +
    'Categories include groceries, restaurants, transport, utilities, subscriptions, shopping, ' +
    'entertainment, cash_withdrawal, investments, transfers_self, income, uncategorized. ' +
    'Defaults to the last 90 days when no range is given. ' +
    'Note: transfers_self moves money between user accounts and should usually be excluded ' +
    'from "real spending"; investments represent money committed to investment platforms.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      from: {
        type: 'string',
        description: 'Start date inclusive (YYYY-MM-DD). Defaults to 90 days ago.',
      },
      to: {
        type: 'string',
        description: 'End date inclusive (YYYY-MM-DD). Defaults to today.',
      },
    },
  },
};

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function handleGetSpendingByCategory(
  repo: CashflowRepository,
  args: SpendingByCategoryArgs = {},
): Promise<string> {
  const today = todayUtc();
  const defaultFrom = new Date(today.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);

  const from = args.from ? parseIsoDate(args.from) : defaultFrom;
  const to = args.to ? parseIsoDate(args.to) : today;

  const all = await repo.listAll();
  const inRange = all.filter((t) => t.date >= from && t.date <= to);

  const byCategory: Partial<Record<Category, number>> = {};
  for (const t of inRange) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  for (const k of Object.keys(byCategory)) {
    byCategory[k as Category] = round2(byCategory[k as Category]!);
  }

  return JSON.stringify({
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    byCategory,
    transactionsCount: inRange.length,
  });
}
