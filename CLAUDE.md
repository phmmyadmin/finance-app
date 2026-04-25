# finance-app — Claude Code conventions

MCP server (stdio) that exposes the user's personal finance data (Google Sheets) as tools so any MCP-compatible client (Claude Desktop, Claude Code) can query and ingest into it.

## Stack (the only tech we use — do not add more without asking)

- Node (latest via `nvm`), `pnpm`, TypeScript strict
- `googleapis` (Drive + Sheets), `@modelcontextprotocol/sdk`, `xlsx`
- `vitest`, `eslint`, `prettier`, `husky` + `lint-staged`, `tsx` (for running `.ts` directly)
- `git` local, no remote, no CI (yet)

When something seems missing, prefer reusing what's there over installing a new dep.

## Architecture (DDD / hexagonal)

```
src/
  module/{name}/
    domain/          # entities + repository ports. No I/O. Type aliases over classes.
    application/     # use cases. Orchestrate domain + repos. Pure-ish.
    infrastructure/  # outbound adapters (Sheets repo, file readers, ...).
    mcp/             # inbound MCP adapter — tool definitions + handlers.
  shared/
    {domain,application,infrastructure}/   # same layering for cross-module helpers
  main.ts            # composition root: wires repos, readers, resolvers, MCP server.
scripts/             # one-shot operational entries (auth, ingest CLI). Not part of runtime.
tests/
  unit/              # mirrors src/ structure. Fast. Pre-commit hook runs them.
  integration/       # hits real Sheets API. Manual via `pnpm test:integration`.
```

Rules of thumb:

- Module names singular nouns (`cashflow`, `investments`, `patrimony`).
- Domain layer never imports from infrastructure/mcp.
- The MCP layer can do user-facing things (fuzzy path resolution, defaults) so domain stays pure.
- Use injected dependencies for anything touching the file system or network — the unit test should not need real I/O.
- New external system = new infrastructure adapter. New domain entity = new module (don't squash unrelated things into an existing one).

## Testing

- TDD as a maxim: red → green → commit. Don't ship code without a test for the unit being added.
- Pure functions over classes when reasonable. Tests inject **fake objects** that satisfy the port; no `vi.mock` on modules unless there is no other way.
- Integration tests are gated by env vars (`describe.skipIf(!hasEnv)`) so they pass cleanly without credentials.
- Two configs: `vitest.config.ts` (unit) and `vitest.integration.config.ts` (integration). `pnpm test` runs unit only.

## Git & commits

- **Conventional Commits**: `feat(scope): …`, `fix(scope): …`, `chore: …`, `refactor(scope): …`, `test(scope): …`. Scope is the module name (`cashflow`, `investments`, `auth`, …).
- **English** commit messages, code, comments, identifiers, READMEs, ADRs. (Conversations with the user can be Spanish.)
- **Small commits**, one concern each. Pre-commit hook runs `lint-staged` + `typecheck` + unit tests.
- **No `Co-Authored-By` trailer.** The user signs commits alone.
- **Husky pre-commit** is the local stand-in for CI. If it fails, fix the underlying problem — never `--no-verify`.

## Code style

- TypeScript: `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`. ESM (`"type": "module"`). Imports use **`.js` extensions** (NodeNext resolution).
- Prefer `type` aliases for ports/value objects (current convention). Classes only when state + behavior justify them (e.g., `SheetsCashflowRepository`).
- Round monetary amounts to 2 decimals at the boundary that produces them.
- ESLint config has `argsIgnorePattern: '^_'` — prefix unused params with `_`.

## MCP conventions

- Each module exposes its tools in `module/{name}/mcp/`.
- A tool file exports two things: `xxxToolDefinition` (name, description, inputSchema, required) and `handleXxx(repo, [...deps], args)`.
- `main.ts` registers all tool definitions in `tools/list` and routes `tools/call` by `request.params.name`.
- Tool handlers return a `string` (serialized JSON when structured); the wrapper in `main.ts` turns it into `{ content: [{ type: 'text', text }] }`.
- Tool names use `snake_case`. Tool inputs are JSON Schema (`type: 'object'`, `properties`, `required`).
- Tools that need fs/path resolution accept an injected resolver function (see `ingestBankExportTool`). Fs touching code lives in `mcp/` only when it is MCP UX (e.g. fuzzy filename matching), otherwise in `infrastructure/`.

## Common workflows

```bash
pnpm auth                            # one-time Google OAuth (read + write on Sheets)
pnpm start                           # run MCP server on stdio (used by Claude Code)
pnpm ingest <bank> <file>            # CLI import (bank ∈ bbva|sabadell|revolut)
pnpm test                            # unit tests
pnpm test:integration                # against real Sheets (needs .env + token)
pnpm typecheck                       # tsc --noEmit
pnpm lint                            # eslint .
pnpm format                          # prettier --write .
```

## What NOT to do

- Don't introduce a new dependency without asking the user first.
- Don't propose tooling for hypothetical future needs (Docker, CI, ORMs, validation libs, etc.). Add when something hurts.
- Don't put writes into a "read-only" port without splitting concerns or asking.
- Don't bypass the dedup in `importTransactions` when adding new ingest paths.
- Don't run destructive operations (delete rows, drop sheets, force-push) without confirming with the user first — they hit a real Google Sheet that holds personal data with no easy undo.
- Don't generate or guess Google Sheet IDs, OAuth credentials, or any path that might point to personal data — always read from `.env` / `.credentials/`.

## Pointers for new modules (recipe)

1. Decide if it is really a new module (separate ubiquitous concept) or a feature inside an existing one.
2. Create `src/module/{name}/{domain,application,infrastructure,mcp}` with the relevant subset.
3. Start with the domain types + a repository port. Add a Sheets impl in `infrastructure/`.
4. TDD a use case in `application/` if there is logic beyond CRUD.
5. Expose the relevant operations as MCP tools in `mcp/`. Wire them in `src/main.ts`.
6. Add an integration test if there is a network/file boundary.
7. Update `README.md` with the new tools.
