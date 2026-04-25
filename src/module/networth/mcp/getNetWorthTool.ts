import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { ValuationsRepository } from '../../investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import { getNetWorth } from '../application/getNetWorth.js';

export const getNetWorthToolDefinition = {
  name: 'get_net_worth',
  description:
    'Get the combined net worth: total cash across banks plus current investment value (using the latest ' +
    'valuation snapshot per platform when available, falling back to invested principal otherwise), ' +
    'compared against the last yearly patrimony snapshot.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function handleGetNetWorth(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  valuations: ValuationsRepository,
  patrimony: PatrimonyRepository,
): Promise<string> {
  const result = await getNetWorth(cashflow, investments, valuations, patrimony);
  return JSON.stringify(result);
}
