import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import { getNetWorth } from '../application/getNetWorth.js';

export const getNetWorthToolDefinition = {
  name: 'get_net_worth',
  description:
    'Get the combined net worth: total cash across banks plus invested principal across platforms, ' +
    'compared against the last yearly patrimony snapshot. Note: investments are valued at their original ' +
    'principal, not current market value.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function handleGetNetWorth(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  patrimony: PatrimonyRepository,
): Promise<string> {
  const result = await getNetWorth(cashflow, investments, patrimony);
  return JSON.stringify(result);
}
