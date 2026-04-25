/**
 * One-shot script: send every uncategorized row in the Cash sheet to a local
 * Ollama model and persist the predicted category in column G.
 *
 * Requires `ollama serve` running locally with the chosen model pulled.
 *
 * Usage: pnpm categorize:pending [--dry-run]
 */
import { google, type sheets_v4 } from 'googleapis';
import { loadGoogleAuth } from '../src/shared/infrastructure/loadGoogleAuth.js';
import type { Category } from '../src/module/cashflow/domain/Category.js';

const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const READ_RANGE = 'Cash!A2:G';
const CONCURRENCY = 4;

const ALLOWED: ReadonlySet<Category> = new Set<Category>([
  'groceries',
  'restaurants',
  'transport',
  'utilities',
  'subscriptions',
  'shopping',
  'entertainment',
  'cash_withdrawal',
  'investments',
  'transfers_self',
  'bizum',
  'income',
  'uncategorized',
]);

const SYSTEM_PROMPT = `You categorize Spanish personal bank transactions.
Reply with EXACTLY one of these category names — lowercase, no punctuation, no explanation:

groceries — supermarkets, food shops (Mercadona, Dia, Carrefour, Condis, Aliprox, Spar, Lidl, Caprabo, K'Aprofiti...)
restaurants — bars, cafes, fast food, restaurants, Glovo / Just Eat / Uber Eats orders
transport — metro, train, taxi, Cabify, Uber, gasolineras, Bicing, parking, peajes, autopistas, vuelos
utilities — electricity, water, internet, phone bills, community fees ("comunidad de propietarios"), taxes (IBI, hacienda), insurance, "adeudo" SEPA from a service company
subscriptions — Netflix, Spotify, Amazon Prime, Disney+, HBO, Apple iCloud/Music, YouTube Premium, recurring software (Adobe, Notion, etc.)
shopping — Amazon Marketplace, AliExpress, Wish, clothes, electronics, books, home goods, gifts, "Pago con tarjeta" at retail merchants
entertainment — cinema, gym, climbing, gaming (Steam, G2A, Epic, PlayStation, NBA League Pass), betting (Bet365), concerts, museums
cash_withdrawal — ATM cash withdrawals only
investments — transfers TO investment platforms (MyInvestor, Urbanitae, Mintos, Esketit, Civislend, Andbank, Revolut X, crypto, IBKR)
transfers_self — VERY RESTRICTIVE: ONLY when the description explicitly mentions the user's own name "Pablo Hernando" / "Pablo Hernando Marrugat", or contains "traspaso a/desde cuenta propia", "ingreso en efectivo bbva oficina", "transferencia recibida saldo". Generic "Pago con tarjeta" or unknown card charges are NOT transfers_self.
bizum — only if "bizum" appears in the description
income — salary (nómina), refunds, transfers received in your favour ("abono por transferencia a su favor"), interest ("remun mes cta"), tax returns
uncategorized — use this when you genuinely cannot tell. PREFER uncategorized OVER guessing transfers_self.

Be decisive but NEVER default to transfers_self when unsure — default to uncategorized instead. Most generic "Pago con tarjeta" entries belong to shopping, restaurants, or transport based on the merchant; if the merchant is unrecognisable, use uncategorized.`;

type PendingRow = {
  rowNumber: number;
  description: string;
  amount: number;
  bank: string;
};

type SheetsApi = sheets_v4.Sheets;

async function readPending(sheets: SheetsApi, spreadsheetId: string): Promise<PendingRow[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: READ_RANGE,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });

  const rows = response.data.values ?? [];
  const pending: PendingRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const [rawDate, rawDescription, rawAmount, , , rawBank, rawCategory] = row;
    if (typeof rawDate !== 'number') continue;

    const category = typeof rawCategory === 'string' ? rawCategory.trim() : '';
    if (category !== '' && category !== 'uncategorized') continue;

    pending.push({
      rowNumber: i + 2,
      description:
        typeof rawDescription === 'string' ? rawDescription : String(rawDescription ?? ''),
      amount: typeof rawAmount === 'number' ? rawAmount : Number(rawAmount ?? 0),
      bank: typeof rawBank === 'string' ? rawBank : '',
    });
  }

  return pending;
}

function normalizeDescription(description: string): string {
  return description.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseCategory(text: string): Category {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '');
  return ALLOWED.has(normalized as Category) ? (normalized as Category) : 'uncategorized';
}

async function classify(description: string): Promise<Category> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0, num_predict: 16 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Description: ${description}` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { message?: { content?: string } };
  return parseCategory(json.message?.content ?? '');
}

async function classifyAll(uniqueDescriptions: string[]): Promise<Map<string, Category>> {
  const results = new Map<string, Category>();
  let done = 0;

  async function worker(slice: string[]): Promise<void> {
    for (const desc of slice) {
      try {
        results.set(desc, await classify(desc));
      } catch (err) {
        console.error(`failed "${desc.slice(0, 40)}...": ${(err as Error).message}`);
        results.set(desc, 'uncategorized');
      }
      done++;
      if (done % 25 === 0 || done === uniqueDescriptions.length) {
        process.stderr.write(`  classified ${done}/${uniqueDescriptions.length}\n`);
      }
    }
  }

  const slices: string[][] = Array.from({ length: CONCURRENCY }, () => []);
  uniqueDescriptions.forEach((desc, i) => {
    slices[i % CONCURRENCY]!.push(desc);
  });

  await Promise.all(slices.map((slice) => worker(slice)));
  return results;
}

async function writeCategories(
  sheets: SheetsApi,
  spreadsheetId: string,
  updates: { rowNumber: number; category: Category }[],
): Promise<void> {
  if (updates.length === 0) return;

  const data = updates.map(({ rowNumber, category }) => ({
    range: `Cash!G${rowNumber}`,
    values: [[category]],
  }));

  // Sheets API caps a single batchUpdate at ~10MB; chunk to be safe.
  const CHUNK = 500;
  for (let i = 0; i < data.length; i += CHUNK) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: data.slice(i, i + CHUNK) },
    });
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID is required');

  const auth = await loadGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  console.error('Reading pending rows from Cash sheet...');
  const pending = await readPending(sheets, spreadsheetId);
  console.error(`Found ${pending.length} uncategorized rows.`);
  if (pending.length === 0) return;

  const buckets = new Map<string, PendingRow[]>();
  for (const row of pending) {
    const key = normalizeDescription(row.description);
    const bucket = buckets.get(key) ?? [];
    bucket.push(row);
    buckets.set(key, bucket);
  }
  console.error(`Deduped to ${buckets.size} unique descriptions (${pending.length} rows).`);

  if (dryRun) {
    console.error('--dry-run: showing first 10 unique descriptions, not classifying.');
    for (const [key, rows] of [...buckets.entries()].slice(0, 10)) {
      console.error(`  (${rows.length}x) ${key.slice(0, 80)}`);
    }
    return;
  }

  console.error(`Classifying with ${MODEL} (concurrency=${CONCURRENCY})...`);
  const t0 = Date.now();
  const classification = await classifyAll([...buckets.keys()]);
  const seconds = ((Date.now() - t0) / 1000).toFixed(0);
  console.error(`Classification done in ${seconds}s.`);

  const updates: { rowNumber: number; category: Category }[] = [];
  for (const [key, rows] of buckets) {
    const category = classification.get(key) ?? 'uncategorized';
    for (const row of rows) updates.push({ rowNumber: row.rowNumber, category });
  }

  const distribution = new Map<Category, number>();
  for (const { category } of updates) {
    distribution.set(category, (distribution.get(category) ?? 0) + 1);
  }
  console.error('Distribution:');
  for (const [category, count] of [...distribution.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  ${category}: ${count}`);
  }

  console.error(`Writing ${updates.length} categories back to column G...`);
  await writeCategories(sheets, spreadsheetId, updates);
  console.error('Done.');
}

await main();
