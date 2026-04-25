import type { sheets_v4 } from 'googleapis';
import type { CashflowRepository } from '../domain/CashflowRepository.js';
import type { Transaction } from '../domain/Transaction.js';
import { parseRows } from './parseRows.js';

const READ_RANGE = 'Cash!A2:F';
const COLUMN_A_RANGE = 'Cash!A2:A';

export class SheetsCashflowRepository implements CashflowRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async listAll(): Promise<Transaction[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: READ_RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    return parseRows(response.data.values ?? []);
  }

  async appendMany(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;

    const colA = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: COLUMN_A_RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const startRow = 2 + (colA.data.values?.length ?? 0);

    const values = transactions.map((t, i) => {
      const r = startRow + i;
      return [
        t.date.toISOString().slice(0, 10),
        t.description,
        t.amount,
        `=TODAY()-A${r}`,
        `=SUM(C$2:C${r})`,
        t.bank ?? '',
      ];
    });

    const endRow = startRow + transactions.length - 1;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Cash!A${startRow}:F${endRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }
}
