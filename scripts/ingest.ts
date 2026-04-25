import { buildAppContext } from '../src/composition.js';
import { importTransactions } from '../src/module/cashflow/application/importTransactions.js';

function usage(): never {
  console.error('Usage: pnpm ingest <bank> <file>');
  console.error('  bank: bbva | sabadell | revolut');
  process.exit(1);
}

async function main(): Promise<void> {
  const [bankArg, filePath] = process.argv.slice(2);
  if (!bankArg || !filePath) usage();

  const ctx = await buildAppContext();
  const reader = ctx.bankReaders[bankArg];
  if (!reader) {
    console.error(
      `Unknown bank "${bankArg}". Expected one of: ${Object.keys(ctx.bankReaders).join(', ')}`,
    );
    process.exit(1);
  }

  console.log(`Reading ${bankArg} export from ${filePath}…`);
  const transactions = await reader(filePath);
  console.log(`  ${transactions.length} transactions parsed`);

  console.log('Deduping against existing Cash sheet and appending…');
  const result = await importTransactions(ctx.cashflowRepo, transactions);

  console.log(`Done. Added: ${result.added}, skipped: ${result.skipped}.`);
}

await main();
