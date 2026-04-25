import { describe, it, expect } from 'vitest';
import {
  handleListValuations,
  listValuationsToolDefinition,
} from '../../../../../src/module/investments/mcp/listValuationsTool.js';
import type { Valuation } from '../../../../../src/module/investments/domain/Valuation.js';
import type { ValuationsRepository } from '../../../../../src/module/investments/domain/ValuationsRepository.js';

const v = (platform: string, date: string, value: number): Valuation => ({
  platform,
  at: new Date(`${date}T00:00:00.000Z`),
  value,
});

const fakeRepo = (valuations: Valuation[]): ValuationsRepository => ({
  listAll: async () => valuations,
  appendOne: async () => {
    throw new Error('appendOne not used in this test');
  },
});

const platforms = (json: string): string[] =>
  (JSON.parse(json) as { platform: string }[]).map((x) => x.platform);

describe('listValuationsToolDefinition', () => {
  it('describes itself', () => {
    expect(listValuationsToolDefinition.name).toBe('list_valuations');
  });
});

describe('handleListValuations', () => {
  it('returns all valuations sorted by date descending', async () => {
    const repo = fakeRepo([
      v('A', '2026-01-01', 100),
      v('B', '2026-03-01', 200),
      v('C', '2026-02-01', 150),
    ]);
    expect(platforms(await handleListValuations(repo))).toEqual(['B', 'C', 'A']);
  });

  it('filters by platform exact match', async () => {
    const repo = fakeRepo([v('A', '2026-01-01', 100), v('B', '2026-02-01', 200)]);
    expect(platforms(await handleListValuations(repo, { platform: 'A' }))).toEqual(['A']);
  });

  it('filters by date range inclusive', async () => {
    const repo = fakeRepo([
      v('A', '2026-01-01', 1),
      v('B', '2026-02-01', 2),
      v('C', '2026-03-01', 3),
    ]);
    const result = await handleListValuations(repo, {
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(platforms(result)).toEqual(['B']);
  });
});
