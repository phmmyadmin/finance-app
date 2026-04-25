import { google } from 'googleapis';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadGoogleAuth } from './shared/infrastructure/loadGoogleAuth.js';
import { SheetsCashflowRepository } from './module/cashflow/infrastructure/SheetsCashflowRepository.js';
import {
  balanceByBankToolDefinition,
  handleGetBalanceByBank,
} from './module/cashflow/mcp/balanceByBankTool.js';
import {
  handleQueryTransactions,
  queryTransactionsToolDefinition,
  type QueryTransactionsArgs,
} from './module/cashflow/mcp/queryTransactionsTool.js';
import {
  handleIngestBankExport,
  ingestBankExportToolDefinition,
  type BankReaders,
} from './module/cashflow/mcp/ingestBankExportTool.js';
import { readBbvaXlsx } from './module/cashflow/infrastructure/imports/readBbvaXlsx.js';
import { readSabadellXls } from './module/cashflow/infrastructure/imports/readSabadellXls.js';
import { readRevolutCsv } from './module/cashflow/infrastructure/imports/readRevolutCsv.js';
import { resolveBankExportFile } from './module/cashflow/mcp/resolveBankExportFile.js';
import { homedir } from 'node:os';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SheetsInvestmentsRepository } from './module/investments/infrastructure/SheetsInvestmentsRepository.js';
import {
  handleListInvestments,
  listInvestmentsToolDefinition,
  type ListInvestmentsArgs,
} from './module/investments/mcp/listInvestmentsTool.js';
import {
  handleGetPortfolioSummary,
  portfolioSummaryToolDefinition,
} from './module/investments/mcp/portfolioSummaryTool.js';
import { SheetsValuationsRepository } from './module/investments/infrastructure/SheetsValuationsRepository.js';
import {
  addValuationToolDefinition,
  handleAddValuation,
  type AddValuationArgs,
} from './module/investments/mcp/addValuationTool.js';
import {
  handleListValuations,
  listValuationsToolDefinition,
  type ListValuationsArgs,
} from './module/investments/mcp/listValuationsTool.js';
import { SheetsPatrimonyRepository } from './module/patrimony/infrastructure/SheetsPatrimonyRepository.js';
import {
  getPatrimonyHistoryToolDefinition,
  handleGetPatrimonyHistory,
} from './module/patrimony/mcp/getPatrimonyHistoryTool.js';
import {
  getNetWorthToolDefinition,
  handleGetNetWorth,
} from './module/networth/mcp/getNetWorthTool.js';

async function main(): Promise<void> {
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
  const resolveFile = (bank: string, hint: string | undefined) =>
    resolveBankExportFile(bank, hint, fsAdapter);

  const server = new Server(
    { name: 'finance-app', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      queryTransactionsToolDefinition,
      balanceByBankToolDefinition,
      ingestBankExportToolDefinition,
      listInvestmentsToolDefinition,
      portfolioSummaryToolDefinition,
      addValuationToolDefinition,
      listValuationsToolDefinition,
      getPatrimonyHistoryToolDefinition,
      getNetWorthToolDefinition,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === queryTransactionsToolDefinition.name) {
      const args = (request.params.arguments ?? {}) as QueryTransactionsArgs;
      const text = await handleQueryTransactions(cashflowRepo, args);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === balanceByBankToolDefinition.name) {
      const text = await handleGetBalanceByBank(cashflowRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === ingestBankExportToolDefinition.name) {
      const args = (request.params.arguments ?? {}) as { bank?: string; file?: string };
      const text = await handleIngestBankExport(cashflowRepo, bankReaders, resolveFile, args);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === listInvestmentsToolDefinition.name) {
      const args = (request.params.arguments ?? {}) as ListInvestmentsArgs;
      const text = await handleListInvestments(investmentsRepo, args);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === portfolioSummaryToolDefinition.name) {
      const text = await handleGetPortfolioSummary(investmentsRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === addValuationToolDefinition.name) {
      const args = (request.params.arguments ?? {}) as AddValuationArgs;
      const text = await handleAddValuation(valuationsRepo, args);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === listValuationsToolDefinition.name) {
      const args = (request.params.arguments ?? {}) as ListValuationsArgs;
      const text = await handleListValuations(valuationsRepo, args);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === getPatrimonyHistoryToolDefinition.name) {
      const text = await handleGetPatrimonyHistory(patrimonyRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === getNetWorthToolDefinition.name) {
      const text = await handleGetNetWorth(cashflowRepo, investmentsRepo, patrimonyRepo);
      return { content: [{ type: 'text', text }] };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is fine; stdout is reserved for the MCP transport.
  console.error('finance-app MCP server ready on stdio');
}

await main();
