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

## Architecture

Hexagonal/clean. Each module under `src/module/{name}` exposes its `domain` (entities and repository interfaces), `application` (use cases) and `infrastructure` (concrete adapters, including MCP tool handlers).
