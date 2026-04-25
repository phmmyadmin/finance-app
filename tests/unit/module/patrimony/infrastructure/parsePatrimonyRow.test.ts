import { describe, it, expect } from 'vitest';
import { parsePatrimonyRow } from '../../../../../src/module/patrimony/infrastructure/parsePatrimonyRow.js';

// Patrimony sheet layout: 0=Year | 1=Patrimony (€) | 2=Improvement (%) | 3=Improvement (€)

describe('parsePatrimonyRow', () => {
  it('parses a fully populated row', () => {
    expect(parsePatrimonyRow([2025, 59508, 0.05308, 3000])).toEqual({
      year: 2025,
      patrimony: 59508,
      improvementPct: 0.05308,
      improvementEur: 3000,
    });
  });

  it('returns null when year is missing or not numeric', () => {
    expect(parsePatrimonyRow([])).toBeNull();
    expect(parsePatrimonyRow(['Year', 'Patrimony (€)'])).toBeNull();
    expect(parsePatrimonyRow([null, 100, 0.1, 10])).toBeNull();
  });

  it('returns null when patrimony amount is missing', () => {
    expect(parsePatrimonyRow([2025, null, 0.1, 10])).toBeNull();
  });

  it('defaults missing improvement fields to 0', () => {
    expect(parsePatrimonyRow([2016, 96])).toEqual({
      year: 2016,
      patrimony: 96,
      improvementPct: 0,
      improvementEur: 0,
    });
  });
});
