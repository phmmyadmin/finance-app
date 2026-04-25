import type { Position } from './Position.js';

export type InvestmentsRepository = {
  listAll(): Promise<Position[]>;
};
