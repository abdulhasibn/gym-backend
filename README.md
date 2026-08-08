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

| Guide                                                        | Audience                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`docs/client-auth.md`](./docs/client-auth.md)               | Auth + **CLIENT** surface map (inbox / accept / grants)                   |
| [`docs/membership-invites.md`](./docs/membership-invites.md) | Admin invites + Client accept + DataGrants                                |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md)                     | Current stage / next up                                                   |
| [`docs/MVP_ROADMAP.md`](./docs/MVP_ROADMAP.md)               | Build order (Orbit tab visualizes this)                                   |
| Postman                                                      | [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) |

**Shipped for CLIENT apps:** OTP/Google auth, membership invite inbox, accept → ACTIVE membership, DataGrants GET/PUT.  
**Next:** Admin subscription manage (1.5), then roster / offboard / block (1.6).

## Scripts

| Script                              | Purpose                                             |
| ----------------------------------- | --------------------------------------------------- |
| `pnpm dev`                          | Run the server with live reload                     |
| `pnpm build`                        | Compile TypeScript to `dist/`                       |
| `pnpm start`                        | Run the compiled server (`dist/app/http-server.js`) |
| `pnpm test`                         | Run the Vitest suite once                           |
| `pnpm test:watch`                   | Run Vitest in watch mode                            |
| `pnpm typecheck`                    | Type-check without emitting                         |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                              |
| `pnpm format` / `pnpm format:check` | Prettier                                            |

Git hooks (Husky, installed via `pnpm install` → `prepare`):

- **pre-commit** — `lint-staged` runs Prettier (and ESLint check) on staged files
- **pre-push** — `format:check`, `typecheck`, `lint`, and `test` (mirrors CI quality gates)

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
