import fs from 'node:fs/promises';
import type { Transaction } from '../../domain/Transaction.js';
import { parseRevolutCsvRow } from './parseRevolutCsvRow.js';

export async function readRevolutCsv(filePath: string): Promise<Transaction[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  // Skip header (first line) and empty trailing lines.
  const dataLines = lines.slice(1).filter((l) => l.length > 0);
  return dataLines
    .map((l) => l.split(','))
    .map(parseRevolutCsvRow)
    .filter((t): t is Transaction => t !== null);
}
