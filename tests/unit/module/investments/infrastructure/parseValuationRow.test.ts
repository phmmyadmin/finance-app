import { describe, it, expect } from 'vitest';
import { parseValuationRow } from '../../../../../src/module/investments/infrastructure/parseValuationRow.js';

// Valuations sheet: 0=Date (serial) | 1=Platform | 2=Value (€)

const EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;
const toSerial = (date: Date): number => Math.round((date.getTime() - EPOCH_UTC_MS) / MS_PER_DAY);

describe('parseValuationRow', () => {
  it('parses a standard row', () => {
    const at = new Date(Date.UTC(2026, 3, 25));
    expect(parseValuationRow([toSerial(at), 'MyInvestor', 47500])).toEqual({
      platform: 'MyInvestor',
      at,
      value: 47500,
    });
  });

  it('returns null when date is missing or not numeric', () => {
    expect(parseValuationRow([])).toBeNull();
    expect(parseValuationRow(['Date', 'Platform', 'Value (€)'])).toBeNull();
    expect(parseValuationRow([null, 'MyInvestor', 100])).toBeNull();
  });

  it('returns null when platform is empty', () => {
    expect(parseValuationRow([45000, '', 100])).toBeNull();
    expect(parseValuationRow([45000, null, 100])).toBeNull();
  });

  it('returns null when value is not numeric', () => {
    expect(parseValuationRow([45000, 'MyInvestor', null])).toBeNull();
    expect(parseValuationRow([45000, 'MyInvestor', 'not-a-number'])).toBeNull();
  });
});
