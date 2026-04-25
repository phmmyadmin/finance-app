import type { AssetClass } from '../domain/AssetClass.js';
import type { Position } from '../domain/Position.js';

const SHEET_TYPE_TO_ASSET_CLASS: Record<string, AssetClass> = {
  'Index Fund': 'equity',
  Lend: 'debt',
  'Real Estate': 'real_estate',
  'Added value': 'real_estate',
  Cripto: 'crypto',
};

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_UTC_MS + serial * MS_PER_DAY);
}

function maybeDate(value: unknown): Date | null {
  return typeof value === 'number' ? serialToDate(value) : null;
}

export function parsePositionRow(platform: string, row: unknown[]): Position | null {
  const [rawName, rawDate, rawType, rawAmount, , rawExpectedProfit, , , rawEndDate] = row;

  if (typeof rawName !== 'string' || rawName.length === 0) return null;
  if (typeof rawAmount !== 'number') return null;

  const sheetType = typeof rawType === 'string' ? rawType : '';
  const assetClass = SHEET_TYPE_TO_ASSET_CLASS[sheetType] ?? 'cash';

  const acquiredAt = maybeDate(rawDate);
  const maturityAt = maybeDate(rawEndDate);
  const hasTerms = typeof rawExpectedProfit === 'number' && maturityAt !== null;

  const position: Position = {
    platform,
    name: rawName,
    assetClass,
    principal: { amount: rawAmount, currency: 'EUR' },
    acquiredAt,
  };

  if (hasTerms) {
    position.terms = {
      expectedReturn: { amount: rawExpectedProfit, currency: 'EUR' },
      maturityAt,
    };
  }

  return position;
}
