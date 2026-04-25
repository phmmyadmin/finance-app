# finance-app

Personal finance management with AI-powered queries over Google Sheets data.

## Stack

- Node (latest), pnpm, TypeScript (strict)
- googleapis (Drive + Sheets)
- @anthropic-ai/sdk (Claude with tool use)
- Vitest, ESLint, Prettier
- Husky + lint-staged

## Setup

```bash
nvm use
pnpm install
```

## Scripts

- `pnpm test` — run tests
- `pnpm test:watch` — run tests in watch mode
- `pnpm typecheck` — type-check without emitting
- `pnpm lint` — lint
- `pnpm format` — format with Prettier

## Architecture

Hexagonal/clean. Each module under `src/module/{name}` exposes its `domain` (entities and repository interfaces), `application` (use cases) and `infrastructure` (concrete adapters).
