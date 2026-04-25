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
});

describe('ingestBankExportToolDefinition', () => {
  it('exposes bank and filePath as required inputs', () => {
    expect(ingestBankExportToolDefinition.name).toBe('ingest_bank_export');
    expect(ingestBankExportToolDefinition.inputSchema.required).toEqual(['bank', 'filePath']);
    expect(ingestBankExportToolDefinition.inputSchema.properties).toHaveProperty('bank');
    expect(ingestBankExportToolDefinition.inputSchema.properties).toHaveProperty('filePath');
  });
});

describe('handleIngestBankExport', () => {
  it('dispatches to the matching reader and runs the import', async () => {
    const repo: CashflowRepository = {
      listAll: async () => [],
      appendMany: vi.fn(async () => {}),
    };
    const readers = {
      bbva: vi.fn(async () => [tx(10), tx(20)]),
      sabadell: vi.fn(async () => []),
    };

    const result = await handleIngestBankExport(repo, readers, {
      bank: 'bbva',
      filePath: '/tmp/bbva.xlsx',
    });

    expect(readers.bbva).toHaveBeenCalledWith('/tmp/bbva.xlsx');
    expect(readers.sabadell).not.toHaveBeenCalled();
    expect(repo.appendMany).toHaveBeenCalledOnce();
    expect(result).toContain('Read 2');
    expect(result).toContain('Added: 2');
    expect(result).toContain('Skipped: 0');
  });

  it('reports skipped count when transactions already exist', async () => {
    const existing = [tx(10)];
    const repo: CashflowRepository = {
      listAll: async () => existing,
      appendMany: vi.fn(async () => {}),
    };
    const readers = {
      bbva: vi.fn(async () => [tx(10), tx(20)]),
    };

    const result = await handleIngestBankExport(repo, readers, {
      bank: 'bbva',
      filePath: '/tmp/x.xlsx',
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
      handleIngestBankExport(repo, { bbva: vi.fn() }, { bank: 'mystery', filePath: '/x' }),
    ).rejects.toThrow(/unknown bank/i);
  });

  it('throws when filePath is missing', async () => {
    const repo: CashflowRepository = {
      listAll: async () => [],
      appendMany: async () => {},
    };
    await expect(
      handleIngestBankExport(repo, { bbva: vi.fn() }, { bank: 'bbva', filePath: '' }),
    ).rejects.toThrow(/filePath/);
  });
});
