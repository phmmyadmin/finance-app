import type { CashflowRepository } from '../domain/CashflowRepository.js';
import { detectRecurringExpenses } from '../application/detectRecurringExpenses.js';

export type RecurringExpensesArgs = {
  minOccurrences?: number;
  activeOnly?: boolean;
  activeWindowDays?: number;
};

export const recurringExpensesToolDefinition = {
  name: 'get_recurring_expenses',
  description:
    'Detect recurring transactions in the Cash sheet (subscriptions, bills, salary). ' +
    'Groups by normalized description, identifies cadence (weekly/monthly/quarterly/yearly), ' +
    'flags price changes, and returns each entry with its estimated monthly cost. ' +
    'Sorted by absolute monthly cost descending.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      minOccurrences: {
        type: 'number',
        description:
          'Minimum number of matching transactions to be considered recurring. Defaults to 3.',
      },
      activeOnly: {
        type: 'boolean',
        description:
          'If true (default), only return items whose latest occurrence is within activeWindowDays.',
      },
      activeWindowDays: {
        type: 'number',
        description: 'Window (in days) for "active" subscriptions. Defaults to 60.',
      },
    },
  },
};

export async function handleGetRecurringExpenses(
  repo: CashflowRepository,
  args: RecurringExpensesArgs = {},
): Promise<string> {
  const all = await repo.listAll();
  const result = detectRecurringExpenses(all, args);
  return JSON.stringify(result);
}
