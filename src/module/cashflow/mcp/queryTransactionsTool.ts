import type { CashflowRepository } from '../domain/CashflowRepository.js';

const DEFAULT_LIMIT = 500;
const DEFAULT_RANGE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export type QueryTransactionsArgs = {
  from?: string;
  to?: string;
  descriptionContains?: string;
  bank?: string;
  limit?: number;
};

export const queryTransactionsToolDefinition = {
  name: 'query_transactions',
  description:
    'Query cash flow transactions with optional filters. Returns matching transactions sorted by ' +
    'date descending, serialized as JSON. If no date range is given, defaults to the last 90 days. ' +
    'Use this for any spending lookup, search by description, or per-period analysis.',
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
      descriptionContains: {
        type: 'string',
        description: 'Case-insensitive substring matched against the transaction description.',
      },
      bank: {
        type: 'string',
        description: 'Filter by exact bank name (e.g., BBVA, SABADELL, REVOLUT, MyInvestor).',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of transactions to return. Defaults to 500.',
      },
    },
  },
};

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function handleQueryTransactions(
  repo: CashflowRepository,
  args: QueryTransactionsArgs = {},
): Promise<string> {
  const today = todayUtc();
  const defaultFrom = new Date(today.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);

  const from = args.from ? parseIsoDate(args.from) : defaultFrom;
  const to = args.to ? parseIsoDate(args.to) : today;
  const limit = args.limit ?? DEFAULT_LIMIT;
  const needle = args.descriptionContains?.toLowerCase();

  const all = await repo.listAll();

  const filtered = all
    .filter((t) => t.date >= from && t.date <= to)
    .filter((t) => (needle ? t.description.toLowerCase().includes(needle) : true))
    .filter((t) => (args.bank ? t.bank === args.bank : true))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)
    .map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      description: t.description,
      amount: t.amount,
      bank: t.bank,
    }));

  return JSON.stringify(filtered);
}
