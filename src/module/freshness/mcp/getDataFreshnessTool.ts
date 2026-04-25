import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { ValuationsRepository } from '../../investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import { getDataFreshness } from '../application/getDataFreshness.js';

export const getDataFreshnessToolDefinition = {
  name: 'get_data_freshness',
  description:
    'Report how stale each data source is: last transaction per bank, last valuation per investment ' +
    'platform (null if never valued), and last patrimony snapshot. Sorted by daysSince descending so the ' +
    'most stale items appear first. Useful for prompting the user to update what is most overdue.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function handleGetDataFreshness(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  valuations: ValuationsRepository,
  patrimony: PatrimonyRepository,
): Promise<string> {
  const result = await getDataFreshness(cashflow, investments, valuations, patrimony);
  return JSON.stringify(result);
}
