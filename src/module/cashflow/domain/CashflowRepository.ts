import type { Transaction } from './Transaction.js';

export type CashflowRepository = {
  listAll(): Promise<Transaction[]>;
  appendMany(transactions: Transaction[]): Promise<void>;
};
