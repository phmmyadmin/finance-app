import type { sheets_v4 } from 'googleapis';
import type { Valuation } from '../domain/Valuation.js';
import type { ValuationsRepository } from '../domain/ValuationsRepository.js';
import { parseValuationRow } from './parseValuationRow.js';

const SHEET_NAME = 'Valuations';
const READ_RANGE = `${SHEET_NAME}!A2:C`;

export class SheetsValuationsRepository implements ValuationsRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async listAll(): Promise<Valuation[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: READ_RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });
    return (response.data.values ?? [])
      .map(parseValuationRow)
      .filter((v): v is Valuation => v !== null);
  }

  async appendOne(valuation: Valuation): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_NAME}!A:C`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[valuation.at.toISOString().slice(0, 10), valuation.platform, valuation.value]],
      },
    });
  }
}
