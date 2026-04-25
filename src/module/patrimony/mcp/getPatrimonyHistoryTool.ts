import type { PatrimonyRepository } from '../domain/PatrimonyRepository.js';

export const getPatrimonyHistoryToolDefinition = {
  name: 'get_patrimony_history',
  description:
    'Get the historical net worth (patrimony) snapshots, one per year, sorted ascending. ' +
    'Each entry has {year, patrimony, improvementPct, improvementEur}.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function handleGetPatrimonyHistory(repo: PatrimonyRepository): Promise<string> {
  const snapshots = await repo.listAll();
  const sorted = [...snapshots].sort((a, b) => a.year - b.year);
  return JSON.stringify(sorted);
}
