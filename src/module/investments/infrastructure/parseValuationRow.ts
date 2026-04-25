import type { Valuation } from '../domain/Valuation.js';

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_UTC_MS + serial * MS_PER_DAY);
}

export function parseValuationRow(row: unknown[]): Valuation | null {
  const rawDate = row[0];
  if (typeof rawDate !== 'number') return null;

  const rawPlatform = row[1];
  if (typeof rawPlatform !== 'string' || rawPlatform.length === 0) return null;

  const rawValue = row[2];
  if (typeof rawValue !== 'number') return null;

  return {
    platform: rawPlatform,
    at: serialToDate(rawDate),
    value: rawValue,
  };
}
