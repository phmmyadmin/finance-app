import type { Valuation } from './Valuation.js';

export type ValuationsRepository = {
  listAll(): Promise<Valuation[]>;
  appendOne(valuation: Valuation): Promise<void>;
};
