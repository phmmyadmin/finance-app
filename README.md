# finance-app

MCP server that exposes personal finance data (Google Sheets) so any MCP-compatible client (Claude Desktop, Claude Code, Cursor…) can query it.

## Stack

- Node (latest), pnpm, TypeScript (strict)
- googleapis (Drive + Sheets)
- @modelcontextprotocol/sdk (MCP server over stdio)
- Vitest, ESLint, Prettier
- Husky + lint-staged

## Setup

```bash
nvm use
pnpm install
cp .env.example .env   # then fill in SPREADSHEET_ID
pnpm auth              # one-time Google OAuth flow (read + write on Sheets) → saves token in .credentials/
```

## Scripts

- `pnpm start` — run the MCP server on stdio
- `pnpm auth` — bootstrap Google OAuth (one-time)
- `pnpm ingest <bank> <file>` — import a bank export into the Cash sheet (`bank` ∈ `bbva|sabadell|revolut`)
- `pnpm categorize:pending` — backfill the `category` column for uncategorized rows using a local Ollama model (requires `ollama serve` with the chosen model pulled; defaults to `qwen2.5:3b`). Pair with the cleanup scripts below.
- `pnpm fix:transfers-self` — revert rows tagged `transfers_self` whose description does not match a known self-transfer pattern back to `uncategorized`.
- `pnpm fix:investments` — revert rows tagged `investments` whose description does not match a known investment-platform pattern back to `uncategorized`.
- `pnpm test` — run unit tests
- `pnpm test:integration` — run integration tests against the real spreadsheet
- `pnpm typecheck` — type-check without emitting
- `pnpm lint` — lint
- `pnpm format` — format with Prettier

## Wiring into Claude Code / Desktop

Add to your MCP client config (e.g. Claude Desktop's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "finance": {
      "command": "node",
      "args": [
        "--import",
        "tsx",
        "--env-file=/absolute/path/to/finance-app/.env",
        "/absolute/path/to/finance-app/src/main.ts"
      ]
    }
  }
}
```

## Tools exposed

**Cashflow:**

- `query_transactions({ from?, to?, descriptionContains?, bank?, limit? })` — returns matching transactions as JSON (with inferred `category`), sorted by date desc. Defaults to the last 90 days.
- `get_balance_by_bank` — returns the current balance per bank as a `{bank: amount}` map.
- `get_spending_by_category({ from?, to? })` — aggregates transactions by inferred category for the period.
- `get_recurring_expenses({ minOccurrences?, activeOnly?, activeWindowDays? })` — detects subscriptions / recurring charges and flags price changes.
- `ingest_bank_export({ bank, filePath })` — read a bank export from disk, dedupe, and append to the Cash sheet (`bank` ∈ `bbva|sabadell|revolut`).

**Investments:**

- `list_investments({ platform?, assetClass? })` — list investment positions, optionally filtered.
- `get_portfolio_summary` — totals invested per platform and per asset class.
- `add_valuation({ platform, value, date? })` — record a snapshot of the current value of a platform.
- `list_valuations({ platform?, from?, to? })` — read valuation history.

**Patrimony:**

- `get_patrimony_history` — yearly net worth snapshots, oldest to newest.

**Combined:**

- `get_net_worth` — cash + investments (latest valuation per platform, fallback to principal) + last patrimony snapshot, with delta vs the snapshot.
- `get_data_freshness` — staleness of every data source (cash per bank, valuations per platform, patrimony) sorted oldest first.

## Raycast menubar extension

`raycast/` is a self-contained Raycast extension that surfaces the current month's spending, net worth and per-source data freshness in the menubar. It does not bundle any finance-app code — it shells out to `scripts/raycast-snapshot.ts` via `tsx` and reads the JSON snapshot from stdout.

```bash
cd raycast
pnpm install
pnpm dev   # opens the extension in Raycast
```

In Raycast's command preferences, set:

- `finance-app path` — absolute path to this repo (default `/Users/pablo/workspace/finance-app`).
- `Node binary path` — output of `which node` (default `/opt/homebrew/bin/node`).

## Architecture

Hexagonal/clean. Each module under `src/module/{name}` exposes its `domain` (entities and repository interfaces), `application` (use cases) and `infrastructure` (concrete adapters, including MCP tool handlers).
