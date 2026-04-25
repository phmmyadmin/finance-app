import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { buildAppContext } from './composition.js';
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
  handleGetSpendingByCategory,
  spendingByCategoryToolDefinition,
  type SpendingByCategoryArgs,
} from './module/cashflow/mcp/spendingByCategoryTool.js';
import {
  handleGetRecurringExpenses,
  recurringExpensesToolDefinition,
  type RecurringExpensesArgs,
} from './module/cashflow/mcp/recurringExpensesTool.js';
import {
  handleIngestBankExport,
  ingestBankExportToolDefinition,
} from './module/cashflow/mcp/ingestBankExportTool.js';
import {
  handleListInvestments,
  listInvestmentsToolDefinition,
  type ListInvestmentsArgs,
} from './module/investments/mcp/listInvestmentsTool.js';
import {
  handleGetPortfolioSummary,
  portfolioSummaryToolDefinition,
} from './module/investments/mcp/portfolioSummaryTool.js';
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
import {
  getPatrimonyHistoryToolDefinition,
  handleGetPatrimonyHistory,
} from './module/patrimony/mcp/getPatrimonyHistoryTool.js';
import {
  getNetWorthToolDefinition,
  handleGetNetWorth,
} from './module/networth/mcp/getNetWorthTool.js';
import {
  getDataFreshnessToolDefinition,
  handleGetDataFreshness,
} from './module/freshness/mcp/getDataFreshnessTool.js';

async function main(): Promise<void> {
  const ctx = await buildAppContext();

  const server = new Server(
    { name: 'finance-app', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      queryTransactionsToolDefinition,
      balanceByBankToolDefinition,
      spendingByCategoryToolDefinition,
      recurringExpensesToolDefinition,
      ingestBankExportToolDefinition,
      listInvestmentsToolDefinition,
      portfolioSummaryToolDefinition,
      addValuationToolDefinition,
      listValuationsToolDefinition,
      getPatrimonyHistoryToolDefinition,
      getNetWorthToolDefinition,
      getDataFreshnessToolDefinition,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = rawArgs ?? {};

    if (name === queryTransactionsToolDefinition.name) {
      const text = await handleQueryTransactions(ctx.cashflowRepo, args as QueryTransactionsArgs);
      return { content: [{ type: 'text', text }] };
    }
    if (name === balanceByBankToolDefinition.name) {
      const text = await handleGetBalanceByBank(ctx.cashflowRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (name === spendingByCategoryToolDefinition.name) {
      const text = await handleGetSpendingByCategory(
        ctx.cashflowRepo,
        args as SpendingByCategoryArgs,
      );
      return { content: [{ type: 'text', text }] };
    }
    if (name === recurringExpensesToolDefinition.name) {
      const text = await handleGetRecurringExpenses(
        ctx.cashflowRepo,
        args as RecurringExpensesArgs,
      );
      return { content: [{ type: 'text', text }] };
    }
    if (name === ingestBankExportToolDefinition.name) {
      const text = await handleIngestBankExport(
        ctx.cashflowRepo,
        ctx.bankReaders,
        ctx.resolveFile,
        args as { bank?: string; file?: string },
      );
      return { content: [{ type: 'text', text }] };
    }
    if (name === listInvestmentsToolDefinition.name) {
      const text = await handleListInvestments(ctx.investmentsRepo, args as ListInvestmentsArgs);
      return { content: [{ type: 'text', text }] };
    }
    if (name === portfolioSummaryToolDefinition.name) {
      const text = await handleGetPortfolioSummary(ctx.investmentsRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (name === addValuationToolDefinition.name) {
      const text = await handleAddValuation(ctx.valuationsRepo, args as AddValuationArgs);
      return { content: [{ type: 'text', text }] };
    }
    if (name === listValuationsToolDefinition.name) {
      const text = await handleListValuations(ctx.valuationsRepo, args as ListValuationsArgs);
      return { content: [{ type: 'text', text }] };
    }
    if (name === getPatrimonyHistoryToolDefinition.name) {
      const text = await handleGetPatrimonyHistory(ctx.patrimonyRepo);
      return { content: [{ type: 'text', text }] };
    }
    if (name === getNetWorthToolDefinition.name) {
      const text = await handleGetNetWorth(
        ctx.cashflowRepo,
        ctx.investmentsRepo,
        ctx.valuationsRepo,
        ctx.patrimonyRepo,
      );
      return { content: [{ type: 'text', text }] };
    }
    if (name === getDataFreshnessToolDefinition.name) {
      const text = await handleGetDataFreshness(
        ctx.cashflowRepo,
        ctx.investmentsRepo,
        ctx.valuationsRepo,
        ctx.patrimonyRepo,
      );
      return { content: [{ type: 'text', text }] };
    }
    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is fine; stdout is reserved for the MCP transport.
  console.error('finance-app MCP server ready on stdio');
}

await main();
