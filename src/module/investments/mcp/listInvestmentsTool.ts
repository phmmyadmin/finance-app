import type { InvestmentsRepository } from '../domain/InvestmentsRepository.js';

export type ListInvestmentsArgs = {
  platform?: string;
  assetClass?: string;
};

export const listInvestmentsToolDefinition = {
  name: 'list_investments',
  description:
    'List investment positions, optionally filtered by platform and/or asset class. ' +
    'Returns each position as JSON: {platform, name, assetClass, principal, acquiredAt, terms?}.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string',
        description:
          'Filter by exact platform name (MyInvestor, Urbanitae, Civislend, Revolut X, Esketit, Mintos).',
      },
      assetClass: {
        type: 'string',
        description: 'Filter by asset class (equity, debt, real_estate, crypto, cash).',
      },
    },
  },
};

export async function handleListInvestments(
  repo: InvestmentsRepository,
  args: ListInvestmentsArgs = {},
): Promise<string> {
  const all = await repo.listAll();

  const filtered = all.filter((p) => {
    if (args.platform && p.platform !== args.platform) return false;
    if (args.assetClass && p.assetClass !== args.assetClass) return false;
    return true;
  });

  const serialized = filtered.map((p) => ({
    platform: p.platform,
    name: p.name,
    assetClass: p.assetClass,
    principal: p.principal,
    acquiredAt: p.acquiredAt?.toISOString().slice(0, 10) ?? null,
    terms: p.terms
      ? {
          expectedReturn: p.terms.expectedReturn,
          maturityAt: p.terms.maturityAt.toISOString().slice(0, 10),
        }
      : undefined,
  }));

  return JSON.stringify(serialized);
}
