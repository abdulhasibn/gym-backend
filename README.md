# Gym SaaS Backend

Node.js + Express + TypeScript API for the Gym SaaS product (Supabase PostgreSQL + Auth).
Clean Architecture feature modules under `src/features/*`. Normative spec:
[`docs/architecture.md`](./docs/architecture.md).

**Live API:** `https://gym-backend-lovat-mu.vercel.app` · **PRD visual:**
[gym-prd-visual.vercel.app](https://gym-prd-visual.vercel.app)

## Stack

- Node.js 22 LTS, TypeScript (strict, CommonJS)
- Express 5
- Supabase (`@supabase/supabase-js`) for PostgreSQL + Auth
- Zod for validation and startup config parsing
- Pino for structured logging
- Vitest + Supertest for testing
- Docker, GitHub Actions for build/CI

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in your Supabase project URL/keys
pnpm dev                # starts the server with live reload (tsx watch)
```

Verify it's running:

```bash
curl http://localhost:3000/health
```

## Client / Admin integration docs

| Guide                                                        | Audience                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [`docs/client-auth.md`](./docs/client-auth.md)               | Auth + **CLIENT** surface map (inbox / accept / grants / subs)                          |
| [`docs/membership-invites.md`](./docs/membership-invites.md) | Admin invites + Client accept + DataGrants                                              |
| [`docs/subscriptions.md`](./docs/subscriptions.md)           | Admin payment / start override + Client subscription list                               |
| [`docs/roster.md`](./docs/roster.md)                         | Roster, gym trainer list, trainer assign, offboard, check-in block                      |
| [`docs/nutrition.md`](./docs/nutrition.md)                   | Food catalog, calorie diary, diet assign + gym templates                                |
| [`docs/coaching.md`](./docs/coaching.md)                     | Exercise catalog search, workout assign, per-day complete                               |
| [`docs/health-sync.md`](./docs/health-sync.md)               | Wearable connect, metrics sync, staff WEARABLES read                                    |
| [`docs/api.md`](./docs/api.md)                               | Endpoint catalogue (trainers, attendance, profile/progress, diet, workout, health sync) |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md)                     | Current stage / next up                                                                 |
| [`docs/MVP_ROADMAP.md`](./docs/MVP_ROADMAP.md)               | Build order (Orbit tab visualizes this)                                                 |
| Postman                                                      | [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman)               |

**Shipped (Stint 1–3.3):** Auth, gym-orgs, Mini-CRM A11–A13, plans, invites/accept/grants, subscriptions core, roster / gym trainer list / assign / offboard / block, attendance, profile/progress, renewals due-list, food catalog + diet + gym diet templates + calorie diary, 30-exercise catalog + workout assign/complete, health-sync connect/sync/read.  
**Next:** Stint 3.4 — CRM convert (A14), then notifications ([Orbit](https://gym-prd-visual.vercel.app/#orbit)).

## Scripts

| Script                              | Purpose                                             |
| ----------------------------------- | --------------------------------------------------- |
| `pnpm dev`                          | Run the server with live reload                     |
| `pnpm build`                        | Compile TypeScript to `dist/`                       |
| `pnpm start`                        | Run the compiled server (`dist/app/http-server.js`) |
| `pnpm test`                         | Run the Vitest suite once (excludes integration)    |
| `pnpm test:watch`                   | Run Vitest in watch mode                            |
| `pnpm test:integration`             | HTTP flows against local Docker Supabase            |
| `pnpm typecheck`                    | Type-check without emitting                         |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                              |
| `pnpm format` / `pnpm format:check` | Prettier                                            |

Git hooks (Husky, installed via `pnpm install` → `prepare`):

- **pre-commit** — `lint-staged` runs Prettier (and ESLint check) on staged files
- **pre-push** — `format:check`, `typecheck`, `lint`, and `test` (mirrors CI quality gates)

## Local HTTP integration tests

These hit the real HTTP surface (`composeApp`) against **local Docker
Supabase** (GoTrue + Postgres + Mailpit). Default `pnpm test` stays offline
and does not start Docker.

1. Start Docker (Colima on macOS is fine).
2. If another local Supabase project already owns ports `54321` / `54322`,
   stop it first (`supabase stop --project-id <id>`).
3. From this repo: `supabase start` (applies `supabase/migrations/`).
4. `cp .env.integration.example .env.integration`
5. `pnpm test:integration`

OTP mail is Mailpit at `http://127.0.0.1:54324` (`INBUCKET_URL`). The suite
aborts unless `SUPABASE_URL` is loopback — never point `.env.integration` at
the hosted project.

## Project structure

```text
src/
├── app/                 # composition root, HTTP server, route mounting
├── features/            # auth, gym-orgs, leads, memberships, …
├── domain/errors/       # shared infra errors (NotFound, Conflict, …)
├── infrastructure/      # Supabase client, logger
├── presentation/http/   # Express middleware
├── shared/              # Result, Pagination, branded-id helper
└── config/              # Zod-validated startup config
```

Feature anatomy follows `docs/architecture.md` §7 (domain / application / infrastructure / presentation / composition).

## Environment variables

See [`.env.example`](./.env.example). Configuration is parsed once at startup
(`src/config/environment.ts`) with Zod and fails fast on missing/invalid values —
application code must never read `process.env` directly.

## Docker

```bash
docker build -t gym-backend .
docker run --env-file .env -p 3000:3000 gym-backend
```

## Architecture

Read [`docs/architecture.md`](./docs/architecture.md) before changing layers, modules, or
dependency directions. ADRs under `docs/adr/` supersede where they conflict.
