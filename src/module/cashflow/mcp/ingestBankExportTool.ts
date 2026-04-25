import type { CashflowRepository } from '../domain/CashflowRepository.js';
import type { Transaction } from '../domain/Transaction.js';
import { importTransactions } from '../application/importTransactions.js';

export type BankReader = (filePath: string) => Promise<Transaction[]> | Transaction[];
export type BankReaders = Record<string, BankReader>;

export const ingestBankExportToolDefinition = {
  name: 'ingest_bank_export',
  description:
    'Read a bank export file from disk, dedupe against the Cash sheet, and append new transactions. ' +
    'Use this when the user has a downloaded bank export (xlsx/xls/csv) and wants it added to the sheet.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      bank: {
        type: 'string',
        description: 'Source bank: bbva, sabadell, or revolut.',
      },
      filePath: {
        type: 'string',
        description: 'Absolute path to the bank export file.',
      },
    },
    required: ['bank', 'filePath'],
  },
};

export async function handleIngestBankExport(
  repo: CashflowRepository,
  readers: BankReaders,
  args: { bank?: string; filePath?: string },
): Promise<string> {
  if (!args.filePath) {
    throw new Error('filePath is required');
  }
  const reader = args.bank ? readers[args.bank] : undefined;
  if (!reader) {
    throw new Error(
      `Unknown bank "${args.bank ?? ''}". Expected one of: ${Object.keys(readers).join(', ')}`,
    );
  }

  const transactions = await reader(args.filePath);
  const result = await importTransactions(repo, transactions);

  return `Read ${transactions.length} transactions from ${args.bank} export. Added: ${result.added}. Skipped: ${result.skipped}.`;
}
