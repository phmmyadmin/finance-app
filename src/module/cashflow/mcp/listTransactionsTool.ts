import type { CashflowRepository } from '../domain/CashflowRepository.js';

export const listTransactionsToolDefinition = {
  name: 'list_transactions',
  description: 'List all cash flow transactions from the finance spreadsheet.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function handleListTransactions(repo: CashflowRepository): Promise<string> {
  const transactions = await repo.listAll();
  const serialized = transactions.map((t) => ({
    date: t.date.toISOString().slice(0, 10),
    description: t.description,
    amount: t.amount,
    bank: t.bank,
  }));
  return JSON.stringify(serialized);
}
