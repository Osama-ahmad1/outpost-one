# OUTPOST ONE – LUNAR SURVIVAL

An immersive browser-based lunar exploration and survival game for students and young people.

## Run & Operate
- `pnpm --filter @workspace/lunar-survival run dev` — managed frontend workflow
- `node artifacts/lunar-survival/src/game/engine.test.mjs` — pure simulation regression checks
- `pnpm --filter @workspace/lunar-survival run check:source-links` — opt-in live NASA URL check (requires network; see `artifacts/lunar-survival/scripts/README.md` for report/exit codes)
- `pnpm --filter @workspace/lunar-survival run test:source-links` — offline source-checker regression tests

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Build entirely from scratch using React, JavaScript and CSS. Do not reuse files, code or designs from the previous OutpostOne project.
- Deliver an actual playable survival game, not an information site, dashboard or repeated-button-clicking experience.
- Clearly distinguish educational simulations from observed NASA data. No live NASA integration is connected; scientific data adapters must preserve source attribution.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
