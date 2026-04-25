export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';

export type RecurringExpense = {
  merchant: string;
  frequency: RecurringFrequency;
  occurrences: number;
  typicalAmount: number;
  latestAmount: number;
  estimatedMonthlyCost: number;
  hasPriceChange: boolean;
  firstSeen: string;
  lastSeen: string;
  examples: string[];
};
