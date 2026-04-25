import { describe, it, expect } from 'vitest';
import {
  handleListInvestments,
  listInvestmentsToolDefinition,
} from '../../../../../src/module/investments/mcp/listInvestmentsTool.js';
import type { InvestmentsRepository } from '../../../../../src/module/investments/domain/InvestmentsRepository.js';
import type { Position } from '../../../../../src/module/investments/domain/Position.js';
import type { AssetClass } from '../../../../../src/module/investments/domain/AssetClass.js';

const position = (
  platform: string,
  name: string,
  assetClass: AssetClass,
  amount: number,
): Position => ({
  platform,
  name,
  assetClass,
  principal: { amount, currency: 'EUR' },
  acquiredAt: null,
});

const fakeRepo = (positions: Position[]): InvestmentsRepository => ({
  listAll: async () => positions,
});

const names = (json: string): string[] =>
  (JSON.parse(json) as { name: string }[]).map((p) => p.name);

describe('listInvestmentsToolDefinition', () => {
  it('describes itself with name and input schema', () => {
    expect(listInvestmentsToolDefinition.name).toBe('list_investments');
    expect(listInvestmentsToolDefinition.inputSchema.properties).toHaveProperty('platform');
    expect(listInvestmentsToolDefinition.inputSchema.properties).toHaveProperty('assetClass');
  });
});

describe('handleListInvestments', () => {
  it('returns all positions when no filter is given', async () => {
    const repo = fakeRepo([
      position('Mintos', 'core', 'debt', 200),
      position('MyInvestor', 'rock', 'equity', 36000),
    ]);

    expect(names(await handleListInvestments(repo))).toEqual(['core', 'rock']);
  });

  it('filters by platform exact match', async () => {
    const repo = fakeRepo([
      position('Mintos', 'core', 'debt', 200),
      position('Urbanitae', 'roca', 'real_estate', 2500),
    ]);

    expect(names(await handleListInvestments(repo, { platform: 'Mintos' }))).toEqual(['core']);
  });

  it('filters by assetClass', async () => {
    const repo = fakeRepo([
      position('Mintos', 'core', 'debt', 200),
      position('Urbanitae', 'roca', 'real_estate', 2500),
      position('Civislend', 'albariza', 'real_estate', 2000),
    ]);

    expect(names(await handleListInvestments(repo, { assetClass: 'real_estate' }))).toEqual([
      'roca',
      'albariza',
    ]);
  });

  it('combines filters', async () => {
    const repo = fakeRepo([
      position('Mintos', 'core', 'debt', 200),
      position('Civislend', 'albariza', 'real_estate', 2000),
      position('Civislend', 'other-debt', 'debt', 500),
    ]);

    const result = await handleListInvestments(repo, {
      platform: 'Civislend',
      assetClass: 'debt',
    });

    expect(names(result)).toEqual(['other-debt']);
  });
});
