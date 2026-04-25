import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addValuationToolDefinition,
  handleAddValuation,
} from '../../../../../src/module/investments/mcp/addValuationTool.js';
import type { ValuationsRepository } from '../../../../../src/module/investments/domain/ValuationsRepository.js';

const fakeRepo = () => {
  const appendOne = vi.fn(async () => {});
  const repo: ValuationsRepository = {
    listAll: async () => [],
    appendOne,
  };
  return { repo, appendOne };
};

describe('addValuationToolDefinition', () => {
  it('requires platform and value', () => {
    expect(addValuationToolDefinition.name).toBe('add_valuation');
    expect(addValuationToolDefinition.inputSchema.required).toEqual(['platform', 'value']);
  });
});

describe('handleAddValuation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends a valuation defaulting to today', async () => {
    const { repo, appendOne } = fakeRepo();

    const result = await handleAddValuation(repo, { platform: 'MyInvestor', value: 47500 });

    expect(appendOne).toHaveBeenCalledWith({
      platform: 'MyInvestor',
      value: 47500,
      at: new Date(Date.UTC(2026, 3, 25)),
    });
    expect(result).toContain('MyInvestor');
    expect(result).toContain('47500');
    expect(result).toContain('2026-04-25');
  });

  it('uses the provided date when given', async () => {
    const { repo, appendOne } = fakeRepo();

    await handleAddValuation(repo, {
      platform: 'Mintos',
      value: 220,
      date: '2026-03-10',
    });

    expect(appendOne).toHaveBeenCalledWith({
      platform: 'Mintos',
      value: 220,
      at: new Date(Date.UTC(2026, 2, 10)),
    });
  });

  it('throws when platform is missing', async () => {
    const { repo } = fakeRepo();
    await expect(handleAddValuation(repo, { value: 100 })).rejects.toThrow(/platform/i);
  });

  it('throws when value is not a positive number', async () => {
    const { repo } = fakeRepo();
    await expect(handleAddValuation(repo, { platform: 'X', value: NaN })).rejects.toThrow(/value/i);
  });

  it('throws when date is malformed', async () => {
    const { repo } = fakeRepo();
    await expect(
      handleAddValuation(repo, { platform: 'X', value: 100, date: '25/03/2026' }),
    ).rejects.toThrow(/date/i);
  });
});
