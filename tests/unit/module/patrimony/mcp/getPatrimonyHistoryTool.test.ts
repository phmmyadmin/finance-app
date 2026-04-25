import { describe, it, expect } from 'vitest';
import {
  getPatrimonyHistoryToolDefinition,
  handleGetPatrimonyHistory,
} from '../../../../../src/module/patrimony/mcp/getPatrimonyHistoryTool.js';
import type { PatrimonyRepository } from '../../../../../src/module/patrimony/domain/PatrimonyRepository.js';
import type { PatrimonySnapshot } from '../../../../../src/module/patrimony/domain/PatrimonySnapshot.js';

const fakeRepo = (snapshots: PatrimonySnapshot[]): PatrimonyRepository => ({
  listAll: async () => snapshots,
});

describe('getPatrimonyHistoryToolDefinition', () => {
  it('describes itself', () => {
    expect(getPatrimonyHistoryToolDefinition.name).toBe('get_patrimony_history');
  });
});

describe('handleGetPatrimonyHistory', () => {
  it('returns the snapshots sorted by year ascending', async () => {
    const repo = fakeRepo([
      { year: 2025, patrimony: 59508, improvementPct: 0.053, improvementEur: 3000 },
      { year: 2016, patrimony: 96, improvementPct: 0, improvementEur: 0 },
      { year: 2020, patrimony: 10000, improvementPct: 0.4, improvementEur: 2857 },
    ]);

    const result = JSON.parse(await handleGetPatrimonyHistory(repo));

    expect(result.map((s: PatrimonySnapshot) => s.year)).toEqual([2016, 2020, 2025]);
  });

  it('returns an empty array when there is no history', async () => {
    expect(JSON.parse(await handleGetPatrimonyHistory(fakeRepo([])))).toEqual([]);
  });
});
