import fs from 'node:fs/promises';
import type { Transaction } from '../../domain/Transaction.js';
import { parseTradeRepublicCsvRow } from './parseTradeRepublicCsvRow.js';

export async function readTradeRepublicCsv(filePath: string): Promise<Transaction[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  // Skip header (first line) and empty trailing lines.
  const dataLines = lines.slice(1).filter((l) => l.trim().length > 0);

  return dataLines
    .map((l) => l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    .map(parseTradeRepublicCsvRow)
    .filter((t): t is Transaction => t !== null);
}
