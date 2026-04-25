import type { PatrimonySnapshot } from '../domain/PatrimonySnapshot.js';

export function parsePatrimonyRow(row: unknown[]): PatrimonySnapshot | null {
  const year = row[0];
  if (typeof year !== 'number') return null;
  const patrimony = row[1];
  if (typeof patrimony !== 'number') return null;

  const improvementPct = typeof row[2] === 'number' ? row[2] : 0;
  const improvementEur = typeof row[3] === 'number' ? row[3] : 0;

  return { year, patrimony, improvementPct, improvementEur };
}
