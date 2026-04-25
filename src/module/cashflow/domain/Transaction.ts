import type { Category } from './Category.js';

export type Transaction = {
  date: Date;
  description: string;
  amount: number;
  bank: string | null;
  category: Category;
};
