# Project Progress Log

> **Agents:** Read the **Current stage** section first. Append a new log entry when you complete a meaningful chunk of work (schema, feature, infra). Keep entries newest-first under the log. Do not rewrite history — only amend **Current stage** / **Next up**.

## Current stage

**Stage:** Auth MVP + gym-orgs profile update and staff invites. Ship via push
to `main` (Vercel auto-deploy). Next: Stint 1 of the MVP roadmap — memberships /
plan catalog. See [`docs/MVP_ROADMAP.md`](MVP_ROADMAP.md) and the Capability
Orbit at [`docs/mvp-roadmap/`](mvp-roadmap/).

| Area | Status |
|------|--------|
| Repo scaffold (Express / TS / Vitest) | Done |
| Domain glossary / PRD / architecture docs | Done |
| DBML source of truth (`docs/schema.dbml`) | Done |
| Supabase project + SQL migrations applied | Done — 16 local; remote includes `accept_staff_invite` |
| Generated `database.types.ts` | Done — includes `accept_staff_invite` RPC |
| Local `.env` with service role key | Done — retrieved from Supabase CLI; ignored by git |
| Seed roles + permissions | Done — 4 roles, 29 permission rows (verified live) |
| Food catalog seed | Not started (`food_items` empty) |
| Feature RLS policies (beyond deny-all) | Not started — 32 public tables RLS on, no policies |
| Auth feature module (`src/features/auth`) | Done — OTP, Google start/callback/complete, `POST /auth/refresh`, provisioning, query-port reads, feature-scoped Bearer middleware, `/auth/me` |
| Auth automated tests | Partial — refresh use-case + route coverage added; provider integration and remaining failure-path coverage still deferred |
| Supabase Google provider | Done — enabled on `igcmptpjmagzwoccxcnw`; Google OAuth E2E smoke ok |
| Custom SMTP + OTP email templates | Done — Gmail SMTP (`smtp.gmail.com:587` as `abdulhasibn@gmail.com`); templates still OTP `{{ .Token }}` |
| Email OTP E2E smoke | Done — OTP request/verify working with Gmail SMTP; App Password rotation deferred by choice |
| Gym organization feature (`src/features/gym-orgs`) | Done for slice 2 — create/list/get/patch; staff invite create/list/inbox/revoke/accept (`staff_code`); list unions trainer affiliations; `accept_staff_invite` RPC applied |
| Other feature modules under `src/features/*` | Not started — sequenced in MVP_ROADMAP Stints 1–3 |
| MVP execution roadmap + Capability Orbit | Done — `docs/MVP_ROADMAP.md`; visual in `prd-showcase` **Orbit** tab (+ 3D) |
| Roles & permissions visual docs | Done — `prd-showcase` **Roles** tab |
| Postman collection shared via git | Done — `../gym-backend-postman` + cloud `Gym Backend API`; folders **Gym Orgs** + **Staff Invites** (was flat under collection root) |
| Vercel production host | Done — `https://gym-backend-lovat-mu.vercel.app` (`/health` 200) |

**Supabase project**

| Field | Value |
|-------|-------|
| Name | `gym-backend` |
| Ref | `igcmptpjmagzwoccxcnw` |
| Region | `ap-south-1` |
| URL | `https://igcmptpjmagzwoccxcnw.supabase.co` |
| Tables | 32 in `public`, RLS enabled (no policies yet) |
| Migrations applied | 16 (local file `20260804070000_accept_staff_invite.sql`; remote applied) |
| Live rows (spot check) | Clean slate — `roles` 4 · `role_permissions` 29 · all other public + `auth.users` 0 (`pnpm db:reset-data -- --yes`) |

## Next up

1. **Stint 1 — Open the Floor** per [`docs/MVP_ROADMAP.md`](MVP_ROADMAP.md):
   plan catalog → membership invites → accept + DataGrants → subscriptions →
   roster/offboard/block. Visual: [`docs/mvp-roadmap/`](mvp-roadmap/).
2. Then Stint 2 (attendance, profile/progress, renewals read model), then
   Stint 3 (coaching, nutrition/food seed, health-sync, leads, notifications).
3. Feature-scoped RLS — not needed while the API uses service-role only;
   revisit if clients ever hit PostgREST/`authenticated` directly.
4. Extra Auth provider/failure-path tests — only when a concrete gap blocks
   shipping or a regression is found (avoid coverage spam).
5. Manual Postman STAFF OTP smoke for get/patch + invite create
   (`422 INVALID_STAFF_INVITEE`) and accept/revoke with a second STAFF
   `inviteeStaffCode` (no committed tokens).

**Deferred longer-term:** verified domain + transactional SMTP off personal
Gmail; App Password rotation (OTP working; rotation skipped for now); push
notifications for staff invites (M12). Full deferred list in MVP_ROADMAP
“Out of orbit.”

## Log

### 2026-08-06 — Orbit tab merged into PRD showcase + redeploy

- Integrated full Capability Orbit into `docs/prd-showcase/` as **Orbit** tab
  (2D orbit, dock, run sheet, deferred) + `orbit-3d.html` for 3D.
- Assets: `roadmap-data.js`, `orbit-app.js`, `orbit.css`, `orbit-3d.*`.
- `docs/mvp-roadmap/` redirects to showcase `#orbit` / 3D page.
- Redeployed production `prd-showcase` (Product · Roles · Orbit).

### 2026-08-06 — Raise Auth OTP / login rate limits

- Patched Auth config on `igcmptpjmagzwoccxcnw`:
  `rate_limit_otp` 30→120, `rate_limit_verify` 30→120,
  `rate_limit_email_sent` 100→300, `smtp_max_frequency` 180s→30s
  (min gap between emails to the same address).
- Mirrored in `scripts/configure-email-otp-template.mjs` so re-running
  `pnpm auth:configure-email-otp` keeps the higher limits.

### 2026-08-06 — Daily DB wipe + `db:reset-data` script

- Wiped remote `igcmptpjmagzwoccxcnw` again (auth + public); roles re-seeded.
- Added `scripts/sql/reset-dev-data.sql` + `scripts/reset-dev-data.mjs`
  (Management API SQL via `SUPABASE_ACCESS_TOKEN`).
- npm script: `pnpm db:reset-data -- --yes` (or `--dry-run`). Confirms
  `auth.users` 0 · `roles` 4 · `role_permissions` 29 after run.

### 2026-08-06 — Roles tab merged into PRD showcase + redeploy

- Merged roles/permissions UI into `docs/prd-showcase/` as a **Product | Roles**
  top tab (lanes, role cards, permission matrix, authz stack).
- Added `roles-data.js`; extended `app.js` / `styles.css` / `index.html`.
- Redeployed production `prd-showcase` →
  [prd-showcase.vercel.app](https://prd-showcase.vercel.app)
  (`#roles` for the Roles tab). Linked from `permissions.md` + `PRD.md`.

### 2026-08-06 — Roles & permissions visual docs site

- Added `docs/roles-permissions/` static site: lane split, interactive role
  cards, filterable permission matrix, authz stack, interpretation notes.
- Mirrors `docs/permissions.md` + seed
  `20260802021422_seed_roles_and_permissions.sql`. Linked from permissions.md.
- Same athletic teal/lime docs language as `prd-showcase`. Open
  `docs/roles-permissions/index.html` or deploy that folder (vercel.json
  included).

### 2026-08-06 — Remote DB clean slate (auth + public data)

- Truncated all 32 `public` tables on `igcmptpjmagzwoccxcnw` (users, gyms,
  profiles, invites, etc.).
- Deleted all `auth.users` (26) — identities/sessions cleared with them.
- Re-seeded frozen `roles` (4) + `role_permissions` (29) from
  `supabase/migrations/20260802021422_seed_roles_and_permissions.sql`.
- Schema / migrations unchanged; ready for fresh Auth + gym-orgs smoke.

### 2026-08-05 — Postman: categorize gym-orgs vs staff invites

- Cloud `Gym Backend API`: moved root-level create/list/get/patch + staff
  invite requests into folders **Gym Orgs** and **Staff Invites** (were
  siblings of Auth, looking like Auth noise).
- Synced folder split into `../gym-backend-postman` collection JSON.

### 2026-08-05 — Fix Vercel npm install + Prettier CI

- Prod deploy `948dc9c` failed: Vercel ran `npm install` (peer conflict /
  phantom `eslint-plugin-prettier`) instead of pnpm.
- Fix: `vercel.json` `installCommand: pnpm install --frozen-lockfile`; pin
  `engines.node` to `22.x`. Format-check CI failed on 9 files — Prettier
  applied.

### 2026-08-05 — Docs + Postman for OTP isNewUser / optional lane

- Updated `docs/client-auth.md`, `docs/product-flows.md` for request
  `isNewUser` and optional verify `lane`.
- Postman cloud + `../gym-backend-postman`: Request/Verify OTP docs,
  tests, 202 example, README smoke flow.

### 2026-08-05 — OTP request returns isNewUser

- `POST /auth/otp/request` now responds
  `{ status: "OTP_SENT", isNewUser }` so clients know when to collect lane.
- `isNewUser` is true when no live `users` row exists for that email
  (`AuthUserRepository.existsByEmail`). Docs: `docs/client-auth.md`.

### 2026-08-05 — Optional lane on OTP verify (returning sign-in)

- `POST /auth/otp/verify`: `lane` is optional. Required only on first
  provision (`422 LANE_REQUIRED` if missing for a new account); returning
  sign-ins may omit it. Sending a different lane still yields `409 LANE_MISMATCH`.
- Docs: `docs/client-auth.md`. Tests: provision + email OTP use cases.

### 2026-08-05 — Postman gym-orgs profile + staff invites

- Cloud collection `Gym Backend API`: added Get/Update Gym Org + Create/List
  Staff Invites, Inbox, Accept, Revoke (root-level; MCP has no folder tool).
- Git export `../gym-backend-postman`: **Gym Orgs** folder groups Create/List
  + seven new requests; vars `gymOrgId` / `staffInviteId` / `inviteeStaffCode`
  on collection + Local/Dev env files; README smoke flow updated.
- Validation: structural OK (desc + Examples + test scripts); local unauth
  probes → `401` on all new paths; gym-orgs route/use-case tests green (16).
- Deferred: authenticated Postman smoke (no `accessToken` in env — needs OTP);
  accept/revoke happy path with second STAFF; push of postman repo.

### 2026-08-05 — MVP execution roadmap + Capability Orbit site

- Added agent-facing [`docs/MVP_ROADMAP.md`](MVP_ROADMAP.md): foundation
  (shipped) + three stints (Open the Floor → Run the Desk → Keep Them Coming)
  with one-by-one build order and exit criteria.
- Added visual site [`docs/mvp-roadmap/`](mvp-roadmap/) — 2D SVG orbit +
  Three.js 3D page (`3d.html`); shared `roadmap-data.js`.
- Next execution item remains Stint 1.1 plan catalog under `memberships`.

### 2026-08-04 — Gym-org profile updates + staff invites

- Extended `src/features/gym-orgs`: `GET`/`PATCH /gym-orgs/:id`; staff invite
  create/list/inbox/revoke/accept via `staff_code` (no email tokens).
- Authz: Admin + live `gym_admins` for write/invite; trainers see orgs via
  affiliation union; inbox is invitee-scoped.
- Domain: `StaffInvite` transitions; admin cap 3; default 14-day expiry;
  CQRS ports + `Clock`/`IdGenerator`; accept via `accept_staff_invite` RPC
  (applied on `igcmptpjmagzwoccxcnw`).
- Inbox computes effective `EXPIRED` without write; persist on accept attempt.
- Tests: 26 gym-orgs unit/route tests green; `docs/client-auth.md` updated.
- Deferred: push notifications, logo upload.

### 2026-08-04 — Revert custom auth session TTLs

- Removed `auth:configure-session-ttl` script; restored project `jwt_exp` to
  Supabase default `3600`. Keep using provider defaults for access/refresh
  lifetime (no app-enforced 2d/1w).
- `POST /auth/refresh` remains; docs/tests no longer claim custom TTLs.

### 2026-08-04 — Auth refresh endpoint

- Added `POST /auth/refresh` (`RefreshSessionUseCase` → Supabase
  `refreshSession`); clients must replace rotated `refreshToken`.
- Tests: refresh use-case + route happy/validation/401 paths.

### 2026-08-03 — Fix POST /gym-orgs rejecting JSON null optionals

- Symptom: documented create body with `"address": null` (etc.) returned
  `422 VALIDATION_ERROR` — Zod `.optional()` rejects `null`.
- Fix: `createGymOrgSchema` optional fields accept string | null | omitted;
  route test + local smoke (`staff OTP → POST /gym-orgs`) both green (201).

### 2026-08-03 — OTP_EXPIRED usually means wrong/partial code

- Supabase project was emitting **8-digit** OTPs while clients/docs often
  assumed 6; partial entry returns GoTrue `otp_expired` (invalid ≡ expired).
- Set `mailer_otp_length=6` via `auth:configure-email-otp`; normalize verify
  token to digits-only; clarify `OtpExpiredError` message and client-auth.md.

### 2026-08-03 — Fix empty Vercel Express build (prod 404)

- Prod `gym-backend-lovat-mu.vercel.app` returned Vercel `NOT_FOUND` for
  `/health` and `/auth/otp/request` — not an Auth bug.
- Root cause: `vercel.json` `buildCommand: ""` made Git deploys finish in
  ~325ms with no serverless output / no Express entry bundled.
- Fix: keep only `"framework": "express"` so Vercel zero-config builds
  `src/server.ts`.

### 2026-08-03 — Client auth integration guide

- Added `docs/client-auth.md` — brief OTP/Google/session/gym-orgs guide for
  mobile/web and AI agents (no separate signup; provision on first verify).

### 2026-08-03 — Postman examples for AI client integration

- Updated live Postman collection (`Gym Backend API` in My Workspace) via
  Postman MCP: each request now has response-type docs + saved Examples
  (success and key error bodies).
- Fixed OTP request body to `{ email }` only (lane belongs on verify).
- Added Create / List gym-org requests with 201/403 and 200 examples.
- Synced export into `../gym-backend-postman` (collection JSON + README).

### 2026-08-03 — Gym-orgs ready to ship via git push

- Added blank-name HTTP validation test (absolute gap only); gym-orgs suite
  is 10 tests. Unauthenticated 401 already covered by auth middleware tests.
- Deploy path: push to `main` → Vercel auto-deploy (no manual MCP/CLI
  publish). Manual file-bundle deploy abandoned.
- Priorities: OTP confirmed; App Password rotation skipped; domain SMTP and
  food seed deferred; RLS stays deny-all + service-role until direct client
  DB access appears; Auth test expansion only for absolute gaps.

### 2026-08-03 — Priorities clarified after OTP confirmation

- OTP confirmed working; App Password rotation skipped for now.
- Domain/transactional SMTP and food catalog seed deferred (not soon).
- Immediate focus: gym-orgs deploy after confirming test sufficiency;
  profile updates / staff invites after that.
- RLS stays intentional deny-all + service-role backend until explained need
  (direct client DB access) appears.
- Auth test expansion: only absolute gaps — no speculative coverage.

### 2026-08-03 — Gmail SMTP wired for Auth OTP delivery

- Supabase Auth SMTP switched from Resend sandbox to Gmail
  (`smtp.gmail.com:587`, sender `abdulhasibn@gmail.com`) via Management API
  (`npm run auth:configure-email-otp`). Supabase MCP has no SMTP config tool.
- Local `.env` SMTP_* updated (gitignored). App Password stored only there.
- Verified: `POST /auth/otp/request` → 202 `OTP_SENT` for
  `abraralhasan111@gmail.com` and `abdulhasibn@gmail.com`; Auth logs show
  `/otp` 200 (`user_confirmation_requested` / `user_recovery_requested`).
- `POST /auth/otp/verify` with dummy token correctly returns `OTP_EXPIRED`
  (422); full happy-path verify deferred until inbox code is available.
- Deferred: domain + transactional provider for production; App Password
  rotation after chat exposure.

### 2026-08-02 — Gym organization initial onboarding implemented

- Added `src/features/gym-orgs/` with domain value objects, CQRS ports,
  create/list use cases, Supabase adapters, HTTP routes, and focused tests.
- `POST /gym-orgs` allows `STAFF_UNASSIGNED` or `ADMIN`; `GET /gym-orgs`
  lists the authenticated user's live Admin affiliations.
- Applied `20260802133634_create_owned_gym_org.sql` to
  `igcmptpjmagzwoccxcnw`. The service-role-only RPC atomically creates the
  org, owner `gym_admins` row, owner `trainer_profiles` row, and promotes
  `STAFF_UNASSIGNED` to `ADMIN`.
- Regenerated `src/infrastructure/supabase/database.types.ts`. Validation:
  Node 22 typecheck, 48 Vitest tests, lint, format check, and build pass.
- **Deferred:** Resend verified domain; organization profile updates, logo
  storage, staff invites, and feature-scoped RLS policies.

### 2026-08-02 — CI workflow unblocked

- Root cause: `pnpm/action-setup@v4` failed with no pnpm version
  (`package.json` lacked `packageManager`).
- Pinned `"packageManager": "pnpm@11.10.0"`; bumped checkout/setup-node to
  `@v5` (Node 24 action runtime).
- Prettier: ignored `.agents/`, `.cursor/`, `.scratch/`; formatted drifted
  app sources so `format:check` passes.
- ESLint: ignore `.scratch/**` (local Vercel scratch bundles).
- Local validation: typecheck, lint, format:check, 39 tests, build all pass.

### 2026-08-02 — Backend hosted on Vercel

- Project `gym-backend` (`prj_IwA7MLzpRjFUprHkMdl9sR85hNfy`) on team
  `abdul-hasib-ns-projects`.
- Production URL: `https://gym-backend-lovat-mu.vercel.app` — `GET /health`
  returns `200 {"status":"ok",...}`.
- Wired Express via `src/server.ts` (Vercel Express entry, lazy compose for
  cold start); production secrets set (`NODE_ENV`, `LOG_LEVEL`, Supabase
  URL/keys).
- **Deferred:** git-connected continuous deploy; Google OAuth / OTP redirect
  URLs still point at local unless updated in Supabase.

### 2026-08-02 — Auth standards remediation

- Split Auth command persistence from the `AuthUserQueries` read port, added a
  shared row reader, and made `GET /auth/me` consume the query port only.
- Moved feature-specific authentication middleware and HTTP error mappings into
  `src/features/auth/presentation/`; shared presentation no longer imports
  feature code.
- Added stable value-object errors, shared identity primitives, typed provider
  email contracts, frozen-role data-integrity handling, and a faithful
  in-memory Google-link implementation.
- Added and applied
  `20260802125637_comment_wearable_daily_metrics.sql` to
  `igcmptpjmagzwoccxcnw`, documenting its intentional no-soft-delete model.
- Moved Auth domain/infrastructure tests into documented test directories and
  expanded the suite to 39 tests.
- Validation: Node 22 typecheck, authored-source lint, and Vitest pass.
  Repository-wide `npm run lint` remains blocked by generated `.scratch/`
  deploy bundles that reference an unavailable ESLint rule.

### 2026-08-02 — Auth review re-check fixes

- Made OTP verification `name` optional so returning users can log in without
  repeating profile data; first-time users fall back to the provider display
  name, email, then `Gym member`.
- Replaced bare Auth entity, mapper, and OAuth-start errors with typed,
  layer-appropriate errors; corrupt persisted auth rows now surface as
  `DATA_INTEGRITY` without exposing details.
- Translate PostgreSQL unique violations during account creation or Google
  identity linking to the existing 409 `UNIQUE_VIOLATION` response.
- Added regression coverage for GoTrue's `otp_expired` response shape and
  the 422 route response. Zod now invokes each Auth value-object factory once.
- The Postman-only OAuth callback helper is disabled in production; Google
  start returns `OAUTH_CONFIGURATION` there until a real client redirect URL
  is configured.
- **Deferred:** an actual production OAuth client redirect/landing surface,
  broader Auth query-port split, provider integration tests, and additional
  failure-path coverage.
- Validation: `npm run typecheck` passes. Lint and Vitest remain blocked
  locally on Node 20.11 because `node:util.styleText` requires Node 22+.

### 2026-08-02 — Auth review findings fixed

- Hardened Auth domain boundaries with `AccountLane` and `EmailAddress` value
  objects plus `AuthUser` lane/role/staff-code invariants.
- Moved Supabase provider failures into Auth domain errors, added stable
  `OTP_EXPIRED` handling, and stopped rendering OAuth access tokens in the
  local callback helper.
- Removed ignored `lane` from OTP-request input; lane is bound at OTP verify
  or Google completion. Updated F1 and permissions documentation accordingly.
- Kept the `client_profiles` creation trigger as intentional Client-owned
  bootstrap. Staff clients render a QR from returned `staffCode`.
- **Deferred:** Google identities without a usable email return
  `EMAIL_NOT_VERIFIED`; the post-Google email-link/verify flow remains
  follow-up work.
- Validation: `npm run typecheck` and `npm run lint` pass. `npm test -- --run`
  is blocked locally because Node 20.11 lacks `node:util.styleText`; this repo
  requires Node 22+.

### 2026-08-02 — Postman collection moved to separate git repo

- Exported **Gym Backend API** + **Gym Backend — Local** (secrets stripped) into sibling
  repo `/Users/abdulhasibnistar/Projects/gym-backend-postman` (initial commit on `main`).
- Removed `postman/` and README Postman section from this backend repo.
- **Deferred:** push `gym-backend-postman` to GitHub (`gh` auth currently invalid); paid
  Postman Team Workspace sharing.

### 2026-08-02 — Progress log reconciled to implementation

- Verified Current stage against repo + remote: 13 migrations (local + linked), 32 RLS tables, seed counts 4/29, only `src/features/auth`, Resend still has no verified domains, SMTP sandbox sender still in local `.env`.
- Confirmed email OTP E2E smoke for `abdulhasibn@gmail.com` (Resend sandbox recipient) after custom SMTP + rate-limit raise.
- Corrected stale Current stage migration count (was 12) and removed completed OTP smoke item from Next up.
- Noted auth automated coverage is partial (16 tests), not full matrix.

### 2026-08-02 — Auth email rate limit raised

- Set `rate_limit_email_sent` to `100` (per hour) on `igcmptpjmagzwoccxcnw` via Management API after custom SMTP was enabled.

### 2026-08-02 — Resend SMTP wired into Supabase Auth

- Created Resend API key `Supabase SMTP gym-backend` (sending_access) via Resend MCP; stored as `SMTP_PASS` in local `.env` (gitignored).
- No Resend domains yet — sender set to sandbox `onboarding@resend.dev` (delivers only to the Resend account email).
- Applied custom SMTP + OTP templates on `igcmptpjmagzwoccxcnw` via Management API (`npm run auth:configure-email-otp`); Auth reloaded successfully.
- Fixed `smtp_port` type in `scripts/configure-email-otp-template.mjs` (API expects string).
- **Deferred:** verified custom domain.

### 2026-08-02 — Email OTP template blocked on free default mailer

- Confirmed Supabase Management API rejects magic-link/confirmation template edits on free tier without custom SMTP.
- Added `scripts/configure-email-otp-template.mjs` / `npm run auth:configure-email-otp` to set OTP body with `{{ .Token }}` once SMTP env vars are present.
- **Blocked on:** Resend (or other) SMTP credentials — default Supabase mail only sends the verify/magic link.

### 2026-08-02 — Google OAuth end-to-end smoke ok

- Confirmed `POST /auth/google/complete` and `GET /auth/me` succeed with a live Google Supabase access token for `abdulhasibn@gmail.com` (CLIENT provisioned).
- Postman 401s were from empty/unresolved `{{accessToken}}` (No Environment / variable not set), not from an invalid Google token.

### 2026-08-02 — Supabase Google OAuth provider enabled

- Wrote Google Cloud Web client credentials into local `.env` and enabled `external_google_*` on `igcmptpjmagzwoccxcnw` via Management API.
- Set `site_url` to `http://127.0.0.1:3000` and allow-listed local `/auth/google/callback` redirect URLs.
- App routes `GET /auth/google/start` and `GET /auth/google/callback` plus Postman helper are ready for the interactive smoke test.
- **Deferred:** Email OTP rate-limit / custom SMTP still separate from Google path.

### 2026-08-02 — Google OAuth wiring prepared (provider secrets pending)

- Added `GET /auth/google/start` (redirect to Supabase authorize) and `GET /auth/google/callback` (dev token capture page).
- Added `scripts/configure-google-oauth.mjs` + `npm run auth:configure-google` to enable Google on project `igcmptpjmagzwoccxcnw` and set local redirect allow-list.
- Postman Google folder includes Start Google OAuth request.
- **Blocked on:** Google Cloud OAuth Web client credentials + Supabase access token (cannot create these without your Google Cloud project).

### 2026-08-02 — Auth OTP error responses mapped from Supabase

- Stopped collapsing all `signInWithOtp` failures into `AUTHENTICATION_FAILED` (401).
- Added `EmailAddressInvalidError` (422), `AuthRateLimitedError` (429), and `OtpDeliveryFailedError` (502) with mapping in `supabase-auth-error.mapper.ts`.
- Verify/getUser still return `AUTHENTICATION_FAILED` for bad credentials; rate limits map to 429 there too.
- Mapper + auth route tests pass (10). Restart local `npm start` to load rebuilt `dist/` if still on the old process.

### 2026-08-02 — Auth MVP module and client profile provisioning

- Added `src/features/auth/` with email OTP request/verification, Google session completion, frozen role lookup by code, lane locking, STAFF code generation, and `GET /auth/me`.
- Added anon Supabase Auth client and provider adapter; Bearer middleware validates tokens remotely and attaches a minimal authenticated actor.
- Added and applied `20260802025500_provision_client_profile.sql` to `igcmptpjmagzwoccxcnw`; the trigger atomically creates `client_profiles` for CLIENT account provisioning. Local and remote migration histories now both contain 13 versions.
- Added application and HTTP tests; TypeScript, ESLint, and Vitest pass under Node 22.
- Created the local gitignored `.env` from project API keys and smoke-tested `GET /health` successfully with that configuration.
- **Deferred:** Supabase dashboard Email OTP / Google provider configuration. Food seed, gym-orgs, and feature RLS remain deferred.

### 2026-08-02 — Pre-auth role and permission seed applied

- Added `docs/permissions.md` with the MVP frozen role/permission matrix.
- Renamed the 11 existing local migration files to the timestamp versions stored in remote migration history, preventing schema replay on `db push`.
- Applied `supabase/migrations/20260802021422_seed_roles_and_permissions.sql` to `igcmptpjmagzwoccxcnw`.
- Seeded 4 frozen roles and 29 role-permission rows; `supabase migration list --linked` confirms all 12 local/remote versions match.
- **Deferred:** food catalog seed, feature-scoped RLS policies, DPDP tombstone/anonymize shape, and local `.env` service-role configuration.

### 2026-08-01 — Orient skill + progress log

- Added always-on rule `.cursor/rules/progress-log.mdc` and running log `docs/PROGRESS.md`.
- Added project skill `.cursor/skills/orient/SKILL.md` — agents must read progress (and task-scoped docs) before planning or implementing in later sessions.

### 2026-08-01 — DBML → Supabase schema

- Created Supabase project `gym-backend` (`igcmptpjmagzwoccxcnw`, `ap-south-1`, free tier).
- Added forward-only SQL under `supabase/migrations/`:
  - `0001` extensions (`pgcrypto`, `btree_gist`) + 15 enums
  - `0002` identity (`roles`, `role_permissions`, `users` → `auth.users`, `client_profiles`)
  - `0003` gym orgs + staff + grants
  - `0004` plans, memberships, subscriptions (circular FK; partial uniques; GiST exclusion via `overlap_key` + trigger — enum→text is not IMMUTABLE for index exprs)
  - `0005` attendance + CLIENT recorder CHECK
  - `0006` nutrition (`food_items` before coaching FKs)
  - `0007` coaching trees + completions
  - `0008` progress + health sync
  - `0009` leads, notifications, audit_logs
  - `0010` enable RLS on all public tables (deny-all baseline)
  - `0011` harden `subscriptions_set_overlap_key` with `search_path = ''`
- Verified: 32 tables, 11 remote migrations, advisors mostly INFO (`rls_enabled_no_policy` expected; unused indexes on empty DB).
- Generated `src/infrastructure/supabase/database.types.ts`.
- **Deferred (by plan):** seeds, real RLS policies, DPDP anonymize shape for `attendances.client_user_id` (still NOT NULL).
- **Uncommitted locally at time of write:** `supabase/`, `database.types.ts` (not pushed).

### 2026-08-01 — Initial scaffold (prior)

- Repo scaffold: Express 5, TypeScript, Vitest, Pino, Zod, `@supabase/supabase-js`.
- Docs: `CONTEXT.md`, `docs/PRD.md`, `docs/architecture.md`, ADRs 0001–0005, `docs/schema.dbml`.
- Empty composition root / health route only; no feature modules yet.
