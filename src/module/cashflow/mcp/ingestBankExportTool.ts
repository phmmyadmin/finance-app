import type { CashflowRepository } from '../domain/CashflowRepository.js';
import type { Transaction } from '../domain/Transaction.js';
import { importTransactions } from '../application/importTransactions.js';

export type BankReader = (filePath: string) => Promise<Transaction[]> | Transaction[];
export type BankReaders = Record<string, BankReader>;
export type BankFileResolver = (bank: string, hint: string | undefined) => string;

export const ingestBankExportToolDefinition = {
  name: 'ingest_bank_export',
  description:
    'Read a bank export from disk, dedupe against the Cash sheet, and append new transactions. ' +
    'The "file" arg is flexible: an absolute path, a "~/..." path, a substring of the filename to ' +
    'find inside ~/Downloads (e.g. "april"), or omitted to use the most recent matching export.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      bank: {
        type: 'string',
        description: 'Source bank: bbva, sabadell, or revolut.',
      },
      file: {
        type: 'string',
        description:
          'Optional path or filename hint. Absolute paths and "~/..." are used directly; ' +
          'anything else is treated as a substring of the filename to look for inside ~/Downloads.',
      },
    },
    required: ['bank'],
  },
};

export async function handleIngestBankExport(
  repo: CashflowRepository,
  readers: BankReaders,
  resolveFile: BankFileResolver,
  args: { bank?: string; file?: string },
): Promise<string> {
  const reader = args.bank ? readers[args.bank] : undefined;
  if (!reader) {
    throw new Error(
      `Unknown bank "${args.bank ?? ''}". Expected one of: ${Object.keys(readers).join(', ')}`,
    );
  }

  const filePath = resolveFile(args.bank!, args.file);
  const transactions = await reader(filePath);
  const result = await importTransactions(repo, transactions);

  return `Resolved ${args.bank} export to ${filePath}. Read ${transactions.length} transactions. Added: ${result.added}. Skipped: ${result.skipped}.`;
}
