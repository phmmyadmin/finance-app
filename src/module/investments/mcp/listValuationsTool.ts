import type { ValuationsRepository } from '../domain/ValuationsRepository.js';

export type ListValuationsArgs = {
  platform?: string;
  from?: string;
  to?: string;
};

export const listValuationsToolDefinition = {
  name: 'list_valuations',
  description:
    'List investment value snapshots, optionally filtered by platform and date range. ' +
    'Returns entries sorted by date descending.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', description: 'Filter by exact platform name.' },
      from: { type: 'string', description: 'Earliest date inclusive (YYYY-MM-DD).' },
      to: { type: 'string', description: 'Latest date inclusive (YYYY-MM-DD).' },
    },
  },
};

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function handleListValuations(
  repo: ValuationsRepository,
  args: ListValuationsArgs = {},
): Promise<string> {
  const all = await repo.listAll();
  const from = args.from ? parseIsoDate(args.from) : undefined;
  const to = args.to ? parseIsoDate(args.to) : undefined;

  const filtered = all
    .filter((v) => (args.platform ? v.platform === args.platform : true))
    .filter((v) => (from ? v.at >= from : true))
    .filter((v) => (to ? v.at <= to : true))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((v) => ({
      platform: v.platform,
      date: v.at.toISOString().slice(0, 10),
      value: v.value,
    }));

  return JSON.stringify(filtered);
}
