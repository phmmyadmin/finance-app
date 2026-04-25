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

async function main(): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  const auth = await loadGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const cashflowRepo = new SheetsCashflowRepository(sheets, spreadsheetId);
  const investmentsRepo = new SheetsInvestmentsRepository(sheets, spreadsheetId);

  const server = new Server(
    { name: 'finance-app', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      queryTransactionsToolDefinition,
      balanceByBankToolDefinition,
      listInvestmentsToolDefinition,
      portfolioSummaryToolDefinition,
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
    if (request.params.name === listInvestmentsToolDefinition.name) {
      const args = (request.params.arguments ?? {}) as ListInvestmentsArgs;
      const text = await handleListInvestments(investmentsRepo, args);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === portfolioSummaryToolDefinition.name) {
      const text = await handleGetPortfolioSummary(investmentsRepo);
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
