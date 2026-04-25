import { describe, it, expect, vi } from 'vitest';
import {
  handleIngestBankExport,
  ingestBankExportToolDefinition,
} from '../../../../../src/module/cashflow/mcp/ingestBankExportTool.js';
import type { CashflowRepository } from '../../../../../src/module/cashflow/domain/CashflowRepository.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const tx = (amount: number): Transaction => ({
  date: new Date(Date.UTC(2026, 3, 1)),
  description: 'irrelevant',
  amount,
  bank: 'BBVA',
  category: 'uncategorized',
});

const stubResolve = (path: string) => () => path;

describe('ingestBankExportToolDefinition', () => {
  it('requires only bank; file is optional', () => {
    expect(ingestBankExportToolDefinition.name).toBe('ingest_bank_export');
    expect(ingestBankExportToolDefinition.inputSchema.required).toEqual(['bank']);
    expect(ingestBankExportToolDefinition.inputSchema.properties).toHaveProperty('file');
  });
});

describe('handleIngestBankExport', () => {
  it('resolves the file via injected resolver and dispatches to the matching reader', async () => {
    const repo: CashflowRepository = {
      listAll: async () => [],
      appendMany: vi.fn(async () => {}),
    };
    const readers = {
      bbva: vi.fn(async () => [tx(10), tx(20)]),
      sabadell: vi.fn(async () => []),
    };
    const resolveFile = vi.fn(() => '/resolved/bbva-april.xlsx');

    const result = await handleIngestBankExport(repo, readers, resolveFile, {
      bank: 'bbva',
      file: 'bbva-april',
    });

    expect(resolveFile).toHaveBeenCalledWith('bbva', 'bbva-april');
    expect(readers.bbva).toHaveBeenCalledWith('/resolved/bbva-april.xlsx');
    expect(result).toContain('/resolved/bbva-april.xlsx');
    expect(result).toContain('Added: 2');
  });

  it('passes undefined hint to the resolver when file is missing', async () => {
    const repo: CashflowRepository = {
      listAll: async () => [],
      appendMany: vi.fn(async () => {}),
    };
    const readers = { bbva: vi.fn(async () => []) };
    const resolveFile = vi.fn(() => '/resolved/foo.xlsx');

    await handleIngestBankExport(repo, readers, resolveFile, { bank: 'bbva' });

    expect(resolveFile).toHaveBeenCalledWith('bbva', undefined);
  });

  it('reports skipped count when transactions already exist', async () => {
    const existing = [tx(10)];
    const repo: CashflowRepository = {
      listAll: async () => existing,
      appendMany: vi.fn(async () => {}),
    };
    const readers = { bbva: vi.fn(async () => [tx(10), tx(20)]) };

    const result = await handleIngestBankExport(repo, readers, stubResolve('/x.xlsx'), {
      bank: 'bbva',
    });

    expect(result).toContain('Added: 1');
    expect(result).toContain('Skipped: 1');
  });

  it('throws when the bank is unknown', async () => {
    const repo: CashflowRepository = {
      listAll: async () => [],
      appendMany: async () => {},
    };
    await expect(
      handleIngestBankExport(repo, { bbva: vi.fn() }, stubResolve('/x'), {
        bank: 'mystery',
      }),
    ).rejects.toThrow(/unknown bank/i);
  });
});
