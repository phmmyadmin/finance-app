/**
 * One-shot fix: revert rows tagged `transfers_self` whose description does NOT
 * match a known self-transfer pattern back to `uncategorized`. Qwen 2.5 3B
 * over-classified into this bucket; this is a coarse cleanup pass.
 */
import { google, type sheets_v4 } from 'googleapis';
import { loadGoogleAuth } from '../src/shared/infrastructure/loadGoogleAuth.js';

const READ_RANGE = 'Cash!A2:G';

// Patterns that genuinely indicate a transfer between the user's own accounts.
// Mirrors the rule in src/module/cashflow/domain/categorize.ts.
const SELF_TRANSFER_PATTERN =
  /pablo hernando|traspaso a cuenta|traspaso desde cuenta|ingreso en efectivo bbva oficina|transferencia recibida saldo/i;

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  const auth = await loadGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: READ_RANGE,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });

  const rows = response.data.values ?? [];
  const updates: { rowNumber: number; description: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const description = typeof row[1] === 'string' ? row[1] : String(row[1] ?? '');
    const category = typeof row[6] === 'string' ? row[6].trim() : '';
    if (category !== 'transfers_self') continue;
    if (SELF_TRANSFER_PATTERN.test(description)) continue;
    updates.push({ rowNumber: i + 2, description });
  }

  console.error(`Found ${updates.length} false transfers_self rows.`);

  if (dryRun) {
    console.error('--dry-run: showing first 15:');
    for (const u of updates.slice(0, 15)) {
      console.error(`  row ${u.rowNumber}: ${u.description.slice(0, 80)}`);
    }
    return;
  }

  if (updates.length === 0) return;

  const data: sheets_v4.Schema$ValueRange[] = updates.map((u) => ({
    range: `Cash!G${u.rowNumber}`,
    values: [['uncategorized']],
  }));

  const CHUNK = 500;
  for (let i = 0; i < data.length; i += CHUNK) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: data.slice(i, i + CHUNK) },
    });
  }

  console.error(`Reset ${updates.length} rows to uncategorized.`);
}

await main();
