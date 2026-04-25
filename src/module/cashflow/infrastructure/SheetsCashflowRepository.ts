import type { sheets_v4 } from 'googleapis';
import type { CashflowRepository } from '../domain/CashflowRepository.js';
import type { Transaction } from '../domain/Transaction.js';
import { parseRows } from './parseRows.js';

const RANGE = 'Cash!A2:F';

export class SheetsCashflowRepository implements CashflowRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async listAll(): Promise<Transaction[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    return parseRows(response.data.values ?? []);
  }
}
