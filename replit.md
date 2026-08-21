# CareLedger

CareLedger is a person-centered financial planning workspace for special-needs families and their care circles.

## Run & Operate

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

- `artifacts/careledger` — the runnable React web app and its theme.
- `artifacts/api-server/src/routes/careledger.ts` — dashboard, people, tasks, and documents API.
- `lib/api-spec/openapi.yaml` — source-of-truth API contract; regenerate clients after changes.

## Architecture decisions

- The first release prioritizes clarity and shared planning over investment automation.
- Benefits-aware planning is framed as organization and reminders, not legal, tax, or fiduciary advice.
- The API currently uses small in-process seed collections so the product can be explored immediately; persistent storage can be added as the next milestone.

## Product

The app gives a caregiver an overview of one active care plan, benefits status, net-worth and monthly-support snapshots, next actions, activity history, supported people, task completion, important documents, and team/safety preferences.

## User preferences

No additional preferences recorded.

## Gotchas

- Use `type: number` rather than OpenAPI `type: integer` in this workspace's spec because the generated Zod package is v3 and does not expose `z.int()`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
