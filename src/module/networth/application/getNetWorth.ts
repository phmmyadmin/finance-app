import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { ValuationsRepository } from '../../investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import type { NetWorth } from '../domain/NetWorth.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function getNetWorth(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  valuations: ValuationsRepository,
  patrimony: PatrimonyRepository,
): Promise<NetWorth> {
  const [transactions, positions, valuationList, snapshots] = await Promise.all([
    cashflow.listAll(),
    investments.listAll(),
    valuations.listAll(),
    patrimony.listAll(),
  ]);

  const cash = transactions.reduce((acc, t) => acc + t.amount, 0);

  const latestValuationByPlatform = new Map<string, number>();
  const latestAtByPlatform = new Map<string, number>();
  for (const v of valuationList) {
    const t = v.at.getTime();
    const previous = latestAtByPlatform.get(v.platform);
    if (previous === undefined || t > previous) {
      latestAtByPlatform.set(v.platform, t);
      latestValuationByPlatform.set(v.platform, v.value);
    }
  }

  const principalByPlatform = new Map<string, number>();
  for (const p of positions) {
    principalByPlatform.set(
      p.platform,
      (principalByPlatform.get(p.platform) ?? 0) + p.principal.amount,
    );
  }

  const knownPlatforms = new Set<string>([
    ...principalByPlatform.keys(),
    ...latestValuationByPlatform.keys(),
  ]);

  let investmentsValue = 0;
  const platformsMissingValuation: string[] = [];
  for (const platform of knownPlatforms) {
    const valuation = latestValuationByPlatform.get(platform);
    if (valuation !== undefined) {
      investmentsValue += valuation;
    } else {
      investmentsValue += principalByPlatform.get(platform) ?? 0;
      platformsMissingValuation.push(platform);
    }
  }

  const computedTotal = cash + investmentsValue;

  const latest = snapshots.reduce<NetWorth['lastPatrimony']>(
    (best, s) =>
      best === undefined || s.year > best.year ? { year: s.year, value: s.patrimony } : best,
    undefined,
  );

  const result: NetWorth = {
    cash: round2(cash),
    investments: round2(investmentsValue),
    computedTotal: round2(computedTotal),
  };

  if (latest) {
    result.lastPatrimony = latest;
    result.deltaSinceLastPatrimony = round2(computedTotal - latest.value);
  }
  if (platformsMissingValuation.length > 0) {
    result.platformsMissingValuation = platformsMissingValuation.sort();
  }

  return result;
}
