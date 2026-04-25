import type { InvestmentsRepository } from '../domain/InvestmentsRepository.js';

export const portfolioSummaryToolDefinition = {
  name: 'get_portfolio_summary',
  description:
    'Get the total principal invested, broken down by platform and by asset class. ' +
    'Note: shows committed amounts, not current market value.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function handleGetPortfolioSummary(repo: InvestmentsRepository): Promise<string> {
  const positions = await repo.listAll();
  const byPlatform: Record<string, number> = {};
  const byAssetClass: Record<string, number> = {};
  let total = 0;

  for (const p of positions) {
    const amount = p.principal.amount;
    byPlatform[p.platform] = (byPlatform[p.platform] ?? 0) + amount;
    byAssetClass[p.assetClass] = (byAssetClass[p.assetClass] ?? 0) + amount;
    total += amount;
  }

  for (const k of Object.keys(byPlatform)) byPlatform[k] = round2(byPlatform[k]!);
  for (const k of Object.keys(byAssetClass)) byAssetClass[k] = round2(byAssetClass[k]!);

  return JSON.stringify({ byPlatform, byAssetClass, total: round2(total) });
}
