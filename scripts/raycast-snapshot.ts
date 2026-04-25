/**
 * Prints a JSON snapshot of the data the Raycast menubar needs:
 *   - month spending + per-category breakdown
 *   - net worth (cash + investments)
 *   - last 5 transactions
 *
 * Invoked by raycast/src/lib/data.ts as a subprocess so the Raycast extension
 * doesn't bundle googleapis or any other finance-app dependency.
 */
import { buildAppContext } from '../src/composition.js';
import { getNetWorth } from '../src/module/networth/application/getNetWorth.js';
import { getDataFreshness } from '../src/module/freshness/application/getDataFreshness.js';
import type { Category } from '../src/module/cashflow/domain/Category.js';

const SPENDING_CATEGORIES = new Set<Category>([
  'groceries',
  'restaurants',
  'transport',
  'utilities',
  'subscriptions',
  'shopping',
  'entertainment',
  'cash_withdrawal',
  'bizum',
  'uncategorized',
]);

async function main(): Promise<void> {
  const ctx = await buildAppContext();
  const [transactions, netWorth, freshness] = await Promise.all([
    ctx.cashflowRepo.listAll(),
    getNetWorth(ctx.cashflowRepo, ctx.investmentsRepo, ctx.valuationsRepo, ctx.patrimonyRepo),
    getDataFreshness(ctx.cashflowRepo, ctx.investmentsRepo, ctx.valuationsRepo, ctx.patrimonyRepo),
  ]);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const totalsByCategory = new Map<Category, number>();
  let monthSpending = 0;
  for (const t of transactions) {
    if (t.date.getUTCFullYear() !== year || t.date.getUTCMonth() !== month) continue;
    if (t.amount >= 0) continue;
    if (!SPENDING_CATEGORIES.has(t.category)) continue;
    monthSpending += t.amount;
    totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + t.amount);
  }

  const monthTopCategories = [...totalsByCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    .map((t) => ({
      date: t.date.toISOString(),
      description: t.description,
      amount: t.amount,
      bank: t.bank,
      category: t.category,
    }));

  process.stdout.write(
    JSON.stringify({
      monthSpending,
      monthTopCategories,
      netWorth,
      recentTransactions,
      freshness,
      generatedAt: now.toISOString(),
    }),
  );
}

await main();
