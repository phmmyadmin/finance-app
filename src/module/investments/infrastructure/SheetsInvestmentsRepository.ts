import type { sheets_v4 } from 'googleapis';
import type { InvestmentsRepository } from '../domain/InvestmentsRepository.js';
import type { Position } from '../domain/Position.js';
import { parsePositionRow } from './parsePositionRow.js';

const PLATFORM_SHEETS = ['MyInvestor', 'Urbanitae', 'Civislend', 'Revolut X', 'Esketit', 'Mintos'];
const RANGE_SUFFIX = '!A2:I';

export class SheetsInvestmentsRepository implements InvestmentsRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async listAll(): Promise<Position[]> {
    const ranges = PLATFORM_SHEETS.map((s) => `'${s}'${RANGE_SUFFIX}`);
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    const positions: Position[] = [];
    for (const [index, valueRange] of (response.data.valueRanges ?? []).entries()) {
      const platform = PLATFORM_SHEETS[index]!;
      for (const row of valueRange.values ?? []) {
        const parsed = parsePositionRow(platform, row);
        if (parsed) positions.push(parsed);
      }
    }
    return positions;
  }
}
