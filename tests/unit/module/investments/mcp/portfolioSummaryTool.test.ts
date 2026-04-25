import { describe, it, expect } from 'vitest';
import {
  handleGetPortfolioSummary,
  portfolioSummaryToolDefinition,
} from '../../../../../src/module/investments/mcp/portfolioSummaryTool.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { Position } from '../../../../../src/module/investments/domain/Position.js';
import type { AssetClass } from '../../../../../src/module/investments/domain/AssetClass.js';

const position = (platform: string, assetClass: AssetClass, amount: number): Position => ({
  platform,
  name: 'irrelevant',
  assetClass,
  principal: { amount, currency: 'EUR' },
  acquiredAt: null,
});

const fakeRepo = (positions: Position[]): InvestmentsRepository => ({
  listAll: async () => positions,
});

describe('portfolioSummaryToolDefinition', () => {
  it('describes itself with name', () => {
    expect(portfolioSummaryToolDefinition.name).toBe('get_portfolio_summary');
  });
});

describe('handleGetPortfolioSummary', () => {
  it('aggregates principal by platform, asset class, and total', async () => {
    const repo = fakeRepo([
      position('MyInvestor', 'equity', 36000),
      position('MyInvestor', 'equity', 6000),
      position('Urbanitae', 'real_estate', 2500),
      position('Civislend', 'real_estate', 2000),
      position('Mintos', 'debt', 200),
    ]);

    const result = JSON.parse(await handleGetPortfolioSummary(repo));

    expect(result).toEqual({
      byPlatform: {
        MyInvestor: 42000,
        Urbanitae: 2500,
        Civislend: 2000,
        Mintos: 200,
      },
      byAssetClass: {
        equity: 42000,
        real_estate: 4500,
        debt: 200,
      },
      total: 46700,
    });
  });

  it('rounds aggregates to 2 decimals', async () => {
    const repo = fakeRepo([position('X', 'debt', 0.1), position('X', 'debt', 0.2)]);

    const result = JSON.parse(await handleGetPortfolioSummary(repo));

    expect(result.byPlatform.X).toBe(0.3);
    expect(result.total).toBe(0.3);
  });

  it('returns zeros and empty maps when there are no positions', async () => {
    const repo = fakeRepo([]);

    expect(JSON.parse(await handleGetPortfolioSummary(repo))).toEqual({
      byPlatform: {},
      byAssetClass: {},
      total: 0,
    });
  });
});
