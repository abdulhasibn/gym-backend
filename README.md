# Gym SaaS Backend

Node.js + Express + TypeScript backend for the Gym SaaS product, using Supabase for
PostgreSQL and Auth. This repository currently contains only the architectural
boilerplate — no feature modules, business logic, or database schema yet. See
[`docs/architecture.md`](./docs/architecture.md) for the full, normative architecture spec
that all future code must follow.

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
├── app/              # composition root, HTTP server entrypoint, route mounting
├── domain/errors/    # generic infra errors shared by every feature (NotFound, Conflict, ...)
├── infrastructure/   # Supabase client, Pino logger — the only place vendor SDKs are imported
├── presentation/http/ # Express middleware: request logging, 404, global error handler
├── shared/           # framework-neutral primitives: Result, Pagination, branded-id helper
└── config/           # Zod-validated startup config, cross-cutting constants
```

`src/features/` does not exist yet — it is added when the first feature module (e.g. `auth`)
is implemented, following the module anatomy described in `docs/architecture.md` §7.

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

This project follows a strict layered/clean-architecture structure (Presentation →
Application → Domain, with Infrastructure implementing Domain ports). Before adding any
code, read:

- [`docs/architecture.md`](./docs/architecture.md) — the normative spec
- [`.cursor/rules/code-quality.mdc`](./.cursor/rules/code-quality.mdc) — naming, Value Objects, branded ids
- [`.cursor/rules/error-handling.mdc`](./.cursor/rules/error-handling.mdc) — error taxonomy and HTTP mapping
- [`.cursor/rules/cursor-database.mdc`](./.cursor/rules/cursor-database.mdc) — Supabase access rules
- [`.cursor/rules/testing.mdc`](./.cursor/rules/testing.mdc) — Vitest/Supertest conventions
