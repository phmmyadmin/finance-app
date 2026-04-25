import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import type { NetWorth } from '../domain/NetWorth.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function getNetWorth(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  patrimony: PatrimonyRepository,
): Promise<NetWorth> {
  const [transactions, positions, snapshots] = await Promise.all([
    cashflow.listAll(),
    investments.listAll(),
    patrimony.listAll(),
  ]);

  const cash = transactions.reduce((acc, t) => acc + t.amount, 0);
  const investmentsPrincipal = positions.reduce((acc, p) => acc + p.principal.amount, 0);
  const computedTotal = cash + investmentsPrincipal;

  const latest = snapshots.reduce<NetWorth['lastPatrimony']>(
    (best, s) =>
      best === undefined || s.year > best.year ? { year: s.year, value: s.patrimony } : best,
    undefined,
  );

  const result: NetWorth = {
    cash: round2(cash),
    investmentsPrincipal: round2(investmentsPrincipal),
    computedTotal: round2(computedTotal),
  };

  if (latest) {
    result.lastPatrimony = latest;
    result.deltaSinceLastPatrimony = round2(computedTotal - latest.value);
  }

  return result;
}
