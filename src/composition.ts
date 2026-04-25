import { readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { google } from 'googleapis';
import { loadGoogleAuth } from './shared/infrastructure/loadGoogleAuth.js';
import { SheetsCashflowRepository } from './module/cashflow/infrastructure/SheetsCashflowRepository.js';
import { readBbvaXlsx } from './module/cashflow/infrastructure/imports/readBbvaXlsx.js';
import { readSabadellXls } from './module/cashflow/infrastructure/imports/readSabadellXls.js';
import { readRevolutCsv } from './module/cashflow/infrastructure/imports/readRevolutCsv.js';
import { resolveBankExportFile } from './module/cashflow/mcp/resolveBankExportFile.js';
import type { BankReaders } from './module/cashflow/mcp/ingestBankExportTool.js';
import { SheetsInvestmentsRepository } from './module/investments/infrastructure/SheetsInvestmentsRepository.js';
import { SheetsValuationsRepository } from './module/investments/infrastructure/SheetsValuationsRepository.js';
import { SheetsPatrimonyRepository } from './module/patrimony/infrastructure/SheetsPatrimonyRepository.js';

export type AppContext = {
  cashflowRepo: SheetsCashflowRepository;
  investmentsRepo: SheetsInvestmentsRepository;
  valuationsRepo: SheetsValuationsRepository;
  patrimonyRepo: SheetsPatrimonyRepository;
  bankReaders: BankReaders;
  resolveFile: (bank: string, hint: string | undefined) => string;
};

/**
 * Composition root. Builds and wires every concrete adapter from environment
 * variables. Both the MCP server (`src/main.ts`) and external clients
 * (e.g. a Raycast extension) consume this single function so the wiring
 * is defined in one place.
 */
export async function buildAppContext(): Promise<AppContext> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  const auth = await loadGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const cashflowRepo = new SheetsCashflowRepository(sheets, spreadsheetId);
  const investmentsRepo = new SheetsInvestmentsRepository(sheets, spreadsheetId);
  const valuationsRepo = new SheetsValuationsRepository(sheets, spreadsheetId);
  const patrimonyRepo = new SheetsPatrimonyRepository(sheets, spreadsheetId);

  const bankReaders: BankReaders = {
    bbva: readBbvaXlsx,
    sabadell: readSabadellXls,
    revolut: readRevolutCsv,
  };

  const fsAdapter = {
    homedir: homedir(),
    listDirectory: (dir: string) =>
      readdirSync(dir).map((name) => ({
        name,
        mtimeMs: statSync(join(dir, name)).mtimeMs,
      })),
  };
  const resolveFile = (bank: string, hint: string | undefined): string =>
    resolveBankExportFile(bank, hint, fsAdapter);

  return {
    cashflowRepo,
    investmentsRepo,
    valuationsRepo,
    patrimonyRepo,
    bankReaders,
    resolveFile,
  };
}
