import type { ValuationsRepository } from '../domain/ValuationsRepository.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type AddValuationArgs = {
  platform?: string;
  value?: number;
  date?: string;
};

export const addValuationToolDefinition = {
  name: 'add_valuation',
  description:
    'Append a snapshot of the current value of an investment platform to the Valuations sheet. ' +
    'Use it whenever the user reports the latest balance of a platform (e.g. "MyInvestor vale 47500 hoy"). ' +
    'Date defaults to today if omitted.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string',
        description:
          'Investment platform name (MyInvestor, Urbanitae, Civislend, Mintos, Esketit, Revolut X, ...).',
      },
      value: {
        type: 'number',
        description: 'Total value of the platform in EUR.',
      },
      date: {
        type: 'string',
        description: 'Optional snapshot date in YYYY-MM-DD format. Defaults to today.',
      },
    },
    required: ['platform', 'value'],
  },
};

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseIsoDate(value: string): Date {
  if (!ISO_DATE_RE.test(value)) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export async function handleAddValuation(
  repo: ValuationsRepository,
  args: AddValuationArgs,
): Promise<string> {
  if (!args.platform || args.platform.length === 0) {
    throw new Error('platform is required');
  }
  if (typeof args.value !== 'number' || !Number.isFinite(args.value)) {
    throw new Error('value must be a finite number');
  }

  const at = args.date ? parseIsoDate(args.date) : todayUtc();
  await repo.appendOne({ platform: args.platform, value: args.value, at });

  return `Recorded ${args.platform} = €${args.value} on ${at.toISOString().slice(0, 10)}.`;
}
