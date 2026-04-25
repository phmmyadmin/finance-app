export type Transaction = {
  date: Date;
  description: string;
  amount: number;
  bank: string | null;
};
