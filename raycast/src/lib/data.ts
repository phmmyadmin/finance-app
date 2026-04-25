import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getPreferenceValues } from '@raycast/api';

const execFileAsync = promisify(execFile);

interface Preferences {
  financeAppPath: string;
  nodePath: string;
}

export type Category =
  | 'groceries'
  | 'restaurants'
  | 'transport'
  | 'utilities'
  | 'subscriptions'
  | 'shopping'
  | 'entertainment'
  | 'cash_withdrawal'
  | 'investments'
  | 'transfers_self'
  | 'bizum'
  | 'income'
  | 'uncategorized';

export type CategoryTotal = { category: Category; amount: number };

export type RecentTransaction = {
  date: string;
  description: string;
  amount: number;
  bank: string | null;
  category: Category;
};

export type NetWorth = {
  cash: number;
  investments: number;
  computedTotal: number;
  lastPatrimony?: { year: number; value: number };
  deltaSinceLastPatrimony?: number;
  platformsMissingValuation?: string[];
};

export type StaleSource = {
  source: string;
  lastUpdate: string | null;
  daysSince: number | null;
};

export type DashboardData = {
  monthSpending: number;
  monthTopCategories: CategoryTotal[];
  netWorth: NetWorth;
  recentTransactions: RecentTransaction[];
  freshness: StaleSource[];
  generatedAt: string;
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const { financeAppPath, nodePath } = getPreferenceValues<Preferences>();
  const { stdout } = await execFileAsync(
    nodePath,
    [
      '--no-deprecation',
      '--import',
      'tsx',
      '--env-file',
      `${financeAppPath}/.env`,
      `${financeAppPath}/scripts/raycast-snapshot.ts`,
    ],
    { cwd: financeAppPath, maxBuffer: 10 * 1024 * 1024 },
  );
  return JSON.parse(stdout) as DashboardData;
}
