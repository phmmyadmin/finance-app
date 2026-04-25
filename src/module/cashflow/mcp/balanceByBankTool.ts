import type { CashflowRepository } from '../domain/CashflowRepository.js';

const NO_BANK_LABEL = '(no bank)';

export const balanceByBankToolDefinition = {
  name: 'get_balance_by_bank',
  description:
    'Get the current balance per bank, computed by summing all cash flow transactions for each bank.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function handleGetBalanceByBank(repo: CashflowRepository): Promise<string> {
  const transactions = await repo.listAll();
  const totals: Record<string, number> = {};

  for (const t of transactions) {
    const key = t.bank ?? NO_BANK_LABEL;
    totals[key] = (totals[key] ?? 0) + t.amount;
  }

  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key]! * 100) / 100;
  }

  return JSON.stringify(totals);
}
