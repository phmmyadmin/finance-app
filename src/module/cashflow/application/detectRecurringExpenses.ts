import type { RecurringExpense, RecurringFrequency } from '../domain/RecurringExpense.js';
import type { Transaction } from '../domain/Transaction.js';

const MS_PER_DAY = 86_400_000;
const PRICE_TOLERANCE = 0.01;
const NORMALIZE_LENGTH = 40;

export type DetectOptions = {
  minOccurrences?: number;
  activeOnly?: boolean;
  activeWindowDays?: number;
  now?: Date;
};

const DEFAULTS = {
  minOccurrences: 3,
  activeOnly: true,
  activeWindowDays: 60,
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

function normalize(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NORMALIZE_LENGTH);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2]!;
  return (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
}

function classifyFrequency(intervals: number[]): RecurringFrequency {
  if (intervals.length === 0) return 'irregular';
  const m = median(intervals);
  if (m >= 5 && m <= 9) return 'weekly';
  if (m >= 25 && m <= 35) return 'monthly';
  if (m >= 80 && m <= 100) return 'quarterly';
  if (m >= 350 && m <= 380) return 'yearly';
  return 'irregular';
}

function monthlyCostFromFrequency(amount: number, freq: RecurringFrequency): number {
  switch (freq) {
    case 'weekly':
      return amount * (52 / 12);
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    case 'irregular':
      return amount;
  }
}

export function detectRecurringExpenses(
  transactions: Transaction[],
  options: DetectOptions = {},
): RecurringExpense[] {
  const opts = { ...DEFAULTS, now: new Date(), ...options };

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = normalize(t.description);
    if (key.length === 0) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(t);
    else groups.set(key, [t]);
  }

  const recurring: RecurringExpense[] = [];

  for (const group of groups.values()) {
    if (group.length < opts.minOccurrences) continue;

    const sorted = [...group].sort((a, b) => a.date.getTime() - b.date.getTime());
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i]!.date.getTime() - sorted[i - 1]!.date.getTime()) / MS_PER_DAY);
    }
    const frequency = classifyFrequency(intervals);

    const amounts = sorted.map((t) => t.amount);
    const typicalAmount = median(amounts);
    const latest = sorted[sorted.length - 1]!;
    const lastSeen = latest.date;

    if (opts.activeOnly) {
      const ageDays = (opts.now.getTime() - lastSeen.getTime()) / MS_PER_DAY;
      if (ageDays > opts.activeWindowDays) continue;
    }

    const hasPriceChange = !amounts.every((a) => Math.abs(a - typicalAmount) < PRICE_TOLERANCE);
    const estimatedMonthlyCost = monthlyCostFromFrequency(typicalAmount, frequency);

    recurring.push({
      merchant: latest.description,
      frequency,
      occurrences: group.length,
      typicalAmount: round2(typicalAmount),
      latestAmount: round2(latest.amount),
      estimatedMonthlyCost: round2(estimatedMonthlyCost),
      hasPriceChange,
      firstSeen: sorted[0]!.date.toISOString().slice(0, 10),
      lastSeen: lastSeen.toISOString().slice(0, 10),
      examples: Array.from(new Set(sorted.slice(-3).map((t) => t.description))),
    });
  }

  recurring.sort((a, b) => Math.abs(b.estimatedMonthlyCost) - Math.abs(a.estimatedMonthlyCost));
  return recurring;
}
