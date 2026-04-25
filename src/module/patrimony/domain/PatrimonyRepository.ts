import type { PatrimonySnapshot } from './PatrimonySnapshot.js';

export type PatrimonyRepository = {
  listAll(): Promise<PatrimonySnapshot[]>;
};
