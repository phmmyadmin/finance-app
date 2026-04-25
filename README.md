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
pnpm auth              # one-time Google OAuth flow → saves token in .credentials/
```

## Scripts

- `pnpm start` — run the MCP server on stdio
- `pnpm auth` — bootstrap Google OAuth (one-time)
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

- `list_transactions` — returns every cash flow transaction from the `Cash` sheet as JSON.
- `get_balance_by_bank` — returns the current balance per bank as a `{bank: amount}` map.

## Architecture

Hexagonal/clean. Each module under `src/module/{name}` exposes its `domain` (entities and repository interfaces), `application` (use cases) and `infrastructure` (concrete adapters, including MCP tool handlers).
