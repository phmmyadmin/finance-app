import { google } from 'googleapis';
import { loadGoogleAuth } from '../src/shared/infrastructure/loadGoogleAuth.js';
import { SheetsCashflowRepository } from '../src/module/cashflow/infrastructure/SheetsCashflowRepository.js';
import { importTransactions } from '../src/module/cashflow/application/importTransactions.js';
import { readBbvaXlsx } from '../src/module/cashflow/infrastructure/imports/readBbvaXlsx.js';
import { readSabadellXls } from '../src/module/cashflow/infrastructure/imports/readSabadellXls.js';
import { readRevolutCsv } from '../src/module/cashflow/infrastructure/imports/readRevolutCsv.js';
import type { Transaction } from '../src/module/cashflow/domain/Transaction.js';

type Bank = 'bbva' | 'sabadell' | 'revolut';

const READERS: Record<Bank, (filePath: string) => Promise<Transaction[]> | Transaction[]> = {
  bbva: readBbvaXlsx,
  sabadell: readSabadellXls,
  revolut: readRevolutCsv,
};

function usage(): never {
  console.error('Usage: pnpm ingest <bank> <file>');
  console.error('  bank: bbva | sabadell | revolut');
  process.exit(1);
}

async function main(): Promise<void> {
  const [bankArg, filePath] = process.argv.slice(2);
  if (!bankArg || !filePath) usage();
  if (!(bankArg in READERS)) {
    console.error(`Unknown bank "${bankArg}". Expected one of: ${Object.keys(READERS).join(', ')}`);
    process.exit(1);
  }

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  console.log(`Reading ${bankArg} export from ${filePath}…`);
  const reader = READERS[bankArg as Bank];
  const transactions = await reader(filePath);
  console.log(`  ${transactions.length} transactions parsed`);

  console.log('Loading auth and connecting to Sheets…');
  const auth = await loadGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const repo = new SheetsCashflowRepository(sheets, spreadsheetId);

  console.log('Deduping against existing Cash sheet and appending…');
  const result = await importTransactions(repo, transactions);

  console.log(`Done. Added: ${result.added}, skipped: ${result.skipped}.`);
}

await main();
