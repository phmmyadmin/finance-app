import { google } from 'googleapis';
import fs from 'node:fs/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SheetsCashflowRepository } from './module/cashflow/infrastructure/SheetsCashflowRepository.js';
import {
  handleListTransactions,
  listTransactionsToolDefinition,
} from './module/cashflow/infrastructure/listTransactionsTool.js';
import {
  balanceByBankToolDefinition,
  handleGetBalanceByBank,
} from './module/cashflow/infrastructure/balanceByBankTool.js';

type InstalledCredentials = {
  installed: { client_id: string; client_secret: string };
};

async function loadAuthClient() {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
  const tokenPath = process.env.GOOGLE_TOKEN_PATH;
  if (!credentialsPath || !tokenPath) {
    throw new Error('GOOGLE_CREDENTIALS_PATH and GOOGLE_TOKEN_PATH are required');
  }

  const credsRaw = await fs.readFile(credentialsPath, 'utf-8');
  const creds = (JSON.parse(credsRaw) as InstalledCredentials).installed;
  const tokenRaw = await fs.readFile(tokenPath, 'utf-8');
  const token = JSON.parse(tokenRaw) as Record<string, unknown>;

  const oauth = new google.auth.OAuth2({
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
  });
  oauth.setCredentials(token);
  return oauth;
}

async function main(): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  const auth = await loadAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const cashflowRepo = new SheetsCashflowRepository(sheets, spreadsheetId);

  const server = new Server(
    { name: 'finance-app', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [listTransactionsToolDefinition, balanceByBankToolDefinition],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === listTransactionsToolDefinition.name) {
      const text = await handleListTransactions(cashflowRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (request.params.name === balanceByBankToolDefinition.name) {
      const text = await handleGetBalanceByBank(cashflowRepo);
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
