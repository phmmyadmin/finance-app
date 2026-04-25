import type { sheets_v4 } from 'googleapis';
import type { PatrimonyRepository } from '../domain/PatrimonyRepository.js';
import type { PatrimonySnapshot } from '../domain/PatrimonySnapshot.js';
import { parsePatrimonyRow } from './parsePatrimonyRow.js';

const RANGE = 'Patrimony!A2:D';

export class SheetsPatrimonyRepository implements PatrimonyRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async listAll(): Promise<PatrimonySnapshot[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const rows = response.data.values ?? [];
    return rows.map(parsePatrimonyRow).filter((s): s is PatrimonySnapshot => s !== null);
  }
}
