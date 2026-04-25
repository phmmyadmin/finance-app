import * as XLSX from 'xlsx';
import type { Transaction } from '../../domain/Transaction.js';
import { parseBbvaRow } from './parseBbvaRow.js';

const SHEET_NAME = 'Informe BBVA';

export function readBbvaXlsx(filePath: string): Transaction[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    throw new Error(`Sheet "${SHEET_NAME}" not found in ${filePath}`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  });

  return rows.map(parseBbvaRow).filter((t): t is Transaction => t !== null);
}
