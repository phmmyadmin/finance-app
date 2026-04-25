import type { CashflowRepository } from '../../cashflow/domain/CashflowRepository.js';
import type { InvestmentsRepository } from '../../investments/domain/InvestmentsRepository.js';
import type { ValuationsRepository } from '../../investments/domain/ValuationsRepository.js';
import type { PatrimonyRepository } from '../../patrimony/domain/PatrimonyRepository.js';
import type { DataFreshness, StaleSource } from '../domain/DataFreshness.js';

const MS_PER_DAY = 86_400_000;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
const daysBetween = (later: Date, earlier: Date): number =>
  Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY);

export async function getDataFreshness(
  cashflow: CashflowRepository,
  investments: InvestmentsRepository,
  valuations: ValuationsRepository,
  patrimony: PatrimonyRepository,
  now: Date = new Date(),
): Promise<DataFreshness> {
  const [transactions, positions, valuationList, snapshots] = await Promise.all([
    cashflow.listAll(),
    investments.listAll(),
    valuations.listAll(),
    patrimony.listAll(),
  ]);

  const items: StaleSource[] = [];

  // Cash per bank
  const lastTxByBank = new Map<string, Date>();
  for (const t of transactions) {
    if (!t.bank) continue;
    const current = lastTxByBank.get(t.bank);
    if (!current || t.date > current) lastTxByBank.set(t.bank, t.date);
  }
  for (const [bank, date] of lastTxByBank) {
    items.push({
      source: `Cash (${bank})`,
      lastUpdate: isoDate(date),
      daysSince: daysBetween(now, date),
    });
  }

  // Valuations per platform (include platforms with positions even if no valuation yet)
  const lastValuationByPlatform = new Map<string, Date>();
  for (const v of valuationList) {
    const current = lastValuationByPlatform.get(v.platform);
    if (!current || v.at > current) lastValuationByPlatform.set(v.platform, v.at);
  }
  const knownPlatforms = new Set<string>([
    ...positions.map((p) => p.platform),
    ...lastValuationByPlatform.keys(),
  ]);
  for (const platform of knownPlatforms) {
    const last = lastValuationByPlatform.get(platform);
    items.push({
      source: `Valuation (${platform})`,
      lastUpdate: last ? isoDate(last) : null,
      daysSince: last ? daysBetween(now, last) : null,
    });
  }

  // Patrimony — latest year as Dec 31 for the day proxy
  const latest = snapshots.reduce<{ year: number } | undefined>(
    (best, s) => (best === undefined || s.year > best.year ? { year: s.year } : best),
    undefined,
  );
  if (latest) {
    const proxy = new Date(Date.UTC(latest.year, 11, 31));
    items.push({
      source: 'Patrimony',
      lastUpdate: isoDate(proxy),
      daysSince: daysBetween(now, proxy),
    });
  }

  // Sort: items with daysSince come first (oldest first); items with null go last.
  items.sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return 0;
    if (a.daysSince === null) return 1;
    if (b.daysSince === null) return -1;
    return b.daysSince - a.daysSince;
  });

  return items;
}
