# Project Progress Log

> **Agents:** Read the **Current stage** section first. Append a new log entry when you complete a meaningful chunk of work (schema, feature, infra). Keep entries newest-first under the log. Do not rewrite history — only amend **Current stage** / **Next up**.

## Current stage

**Stage:** Stint **3.4** shipped (CRM convert A14: lead → membership invite).
Stints **3.1–3.3** (diet + workout + health-sync) remain live. See [`docs/MVP_ROADMAP.md`](MVP_ROADMAP.md).
A8b still deferred within 1.5.

| Area | Status |
|------|--------|
| Repo scaffold (Express / TS / Vitest) | Done |
| Domain glossary / PRD / architecture docs | Done — ADR-0006 food diary · ADR-0007 exercise catalog · ADR-0008 diet templates |
| DBML source of truth (`docs/schema.dbml`) | Done — `leads.email` optional (A14) |
| Supabase project + SQL migrations applied | Done — 24 local + remote; through `20260818100000` (leads email) |
| Generated `database.types.ts` | Done — `leads.email` |
| Local `.env` with service role key | Done — retrieved from Supabase CLI; ignored by git |
| Seed roles + permissions | Done — 4 roles, 29 permission rows (verified live) |
| Food catalog seed | Done — 20 foods × 8 units (160 servings), `source=seed` |
| Exercise catalog seed | Done — 30 movements, `source=seed` (ADR-0007) |
| Feature RLS policies (beyond deny-all) | Not started — 36 public tables RLS on, no policies |
| Auth feature module (`src/features/auth`) | Done — OTP, Google start/callback/complete, `POST /auth/refresh`, provisioning, query-port reads, feature-scoped Bearer middleware, `/auth/me`; access tokens verified locally (`getClaims` JWKS / jose HS256), not `auth.getUser` per request
| Auth automated tests | Partial — refresh use-case + route coverage added; Google provider E2E and remaining failure-path coverage still deferred |
| HTTP integration (local Docker) | Done — 14 files / 39 tests via `pnpm test:integration`; default `pnpm test` stays offline; CI Docker job deferred |
| Supabase Google provider | Done — enabled on `igcmptpjmagzwoccxcnw`; Google OAuth E2E smoke ok |
| Custom SMTP + OTP email templates | Done — Gmail SMTP (`smtp.gmail.com:587` as `abdulhasibn@gmail.com`); templates still OTP `{{ .Token }}` |
| Email OTP E2E smoke | Done — OTP request/verify working with Gmail SMTP; App Password rotation deferred by choice |
| Gym organization feature (`src/features/gym-orgs`) | Done for slice 2 — create/list/get/patch; staff invite create/list/inbox/revoke/accept (`staff_code`); inbox embeds gym profile; list unions trainer affiliations; `accept_staff_invite` RPC applied; **`GET .../trainers`** (dedicated mount so coaching catch-alls cannot 404 it) |
| Mini-CRM / leads (`src/features/leads`) | Done — A11–A14: CRUD, pipeline, optional email, convert → PENDING membership invite. Push reminders deferred (3.5) |
| Memberships feature (`src/features/memberships`) | Phase 1–5 + 2.4 renewals due-list done — plans, invites, accept/grants, subscriptions, roster/assign/offboard/block, `GET .../subscriptions/renewals-due`; A8b attach/renew deferred |
| Attendance feature (`src/features/attendance`) | Done — self check-in, Admin desk mark, gym-day + per-client + my history; FIRST_ATTENDANCE base start; enforces `check_in_blocked` |
| Users / progress (`src/features/users`) | Done — `/me/profile` + progress logs (BMI); staff grant-gated profile/progress reads |
| Nutrition (`src/features/nutrition`) | Done — seed search, extras diary, staff CALORIES read, `LogPrescribedFood` port. No CustomFood |
| Coaching diet (`src/features/coaching`) | Done — assign XOR meals/`templateId`, gym templates CRUD/duplicate, complete into diary |
| Coaching workout (`src/features/coaching`) | Done — `GET /exercises/search`, assign/replace `WorkoutPlan`, staff GET, Client GET + per-day complete/uncomplete (not set logs; not CustomExercise; no gym workout templates) |
| Health sync (`src/features/health-sync`) | Done — connect/disconnect, batch metrics sync (device-push), client list, staff WEARABLES grant read; weight → ProgressLog via users port |
| Other feature modules under `src/features/*` | Next **3.5** notifications; then audit |
| MVP execution roadmap + Capability Orbit | Done — `docs/MVP_ROADMAP.md`; visual in `prd-showcase` **Orbit** tab (+ 3D); 3.1/3.2 retitled (ADR-0006) |
| Roles & permissions visual docs | Done — `prd-showcase` **Roles** tab |
| PRD showcase host | Done — `https://gym-prd-visual.vercel.app` (old `prd-showcase` project deleted) |
| Postman collection shared via git | Done — `../gym-backend-postman` + cloud `Gym Backend API`; folders through **Health Sync** (3.3) synced git + cloud |
| Vercel production host | Done — `https://gym-backend-lovat-mu.vercel.app` (`/health` 200); function region `bom1` (Mumbai) |

**Supabase project**

| Field | Value |
|-------|-------|
| Name | `gym-backend` |
| Ref | `igcmptpjmagzwoccxcnw` |
| Region | `ap-south-1` |
| URL | `https://igcmptpjmagzwoccxcnw.supabase.co` |
| Tables | 36 in `public`; RLS enabled (no policies) |
| Migrations applied | 24 — remote through `20260818100000_leads_email` |
| Live rows (spot check) | `roles` 4 · `role_permissions` 29 · `food_items` 20 · `food_item_servings` 160 · `exercise_items` 30 |

## Next up

1. **Stint 3.5** — notifications + scheduled jobs (T-2, unpaid digest, lead follow-ups).
2. Then audit (3.6).
3. Later: broader food/exercise seed; CustomFood / CustomExercise APIs;
   gym workout templates; T8 `WORKOUT_PLANS` staff adherence overlay.
4. Optional later within 1.5: A8b addon attach mid-cycle + renew-as-new-row.
5. Feature-scoped RLS — not needed while the API uses service-role only.
6. Extra Auth provider/failure-path tests — only when a concrete gap blocks
   shipping. Manual Postman smoke optional.

**Deferred longer-term:** verified domain + transactional SMTP off personal
Gmail; App Password rotation (OTP working; rotation skipped for now); push
notifications for staff invites (M12). Full deferred list in MVP_ROADMAP
“Out of orbit.” (Includes barcode / Snap / NL-as-store.)

## Log

### 2026-08-18 — Ship Stint 3.4 CRM convert (A14)

- Optional `leads.email` (nullable, not unique) + `LeadEmail` VO; create/update/list
  expose it. Migration `20260818100000_leads_email` applied local + remote.
- `POST /gym-orgs/:gymOrgId/leads/:leadId/convert` creates a PENDING membership
  invite (name/phone from lead; email = body `invitedEmail` ?? lead email). Marks
  `CONVERTED` and sets `converted_membership_invite_id`. Cross-feature via
  `CreateMembershipInviteFromLead` port wired at composition-root.
- Tests: domain + use cases + routes; integration convert with and without stored
  email (Vitest 258 unit tests).
- Docs: leads/api/flows/MVP/Orbit 3.4 done. Postman **Leads** Convert + email
  fields in follow-up log if needed.
- Deferred: follow-up push/inbox (3.5); invite email/push.

### 2026-08-18 — Sync Postman + docs after 3.3 health-sync

- Postman git `gym-backend-postman` `8d54a09`: **Health Sync** folder (6
  requests, Story docs + Examples). Audit `gapCount` 0.
- Cloud `putCollection` async restored full collection (includes Health Sync);
  verified 14 top-level folders on `Gym Backend API`.
- Docs: README Shipped/Next through 3.3; `modules-data.js` M10 API live (3.3);
  `roadmap-data.js` mirror unchanged (3.3 already done).
- Orbit prod https://gym-prd-visual.vercel.app — lede 3.1–3.3 lit, next 3.4.

### 2026-08-18 — Ship Stint 3.3 health-sync APIs

- New `src/features/health-sync/`: connect/disconnect wearable providers,
  batch daily metrics ingest (device-push canonical DTO), client list, staff
  read gated on `WEARABLES` grant. Reuses existing `wearable_*` tables — no
  migration.
- Weight in sync upserts ProgressLog + profile via `SyncWearableWeightUseCase`
  in users (exported from `users/composition`; wired at composition-root).
- Routes: `/me/wearable-connections`, `/me/wearable-metrics/sync`,
  `/gym-orgs/:gymOrgId/clients/:clientUserId/wearable-metrics`.
- Tests: domain + application + routes; `health-sync.integration.test.ts`
  (Health Connect path). Vitest 244 unit tests green.
- Docs: `docs/health-sync.md`; api/client-auth/product-flows/MVP/Orbit 3.3
  done. Postman **Health Sync** folder in `../gym-backend-postman` (`gapCount`
  0 audit); cloud sync in follow-up log entry same day.
- Deferred: background scheduled sync jobs (3.5); per-provider payload
  normalizers beyond canonical DTO; server OAuth.

### 2026-08-18 — Cut ~3s API latency (region + local JWT)

- Detour from Next up (3.3 health-sync). Product APIs unchanged.
- Cause: Vercel Lambda in `iad1` calling Supabase `ap-south-1`, plus
  remote `auth.getUser` on every Bearer request (four sequential hops
  on GET plans). `/health` was already 350–740ms from India.
- Pin `vercel.json` `regions` to `bom1`. Verify access tokens in
  process: hosted ES256 via `getClaims` (JWKS); local Docker HS256 via
  dynamic `import('jose')` when `SUPABASE_JWT_SECRET` is set (static
  jose import crashed Vercel CJS with `ERR_REQUIRE_ESM`).
- `Server-Timing` + pino `spans` (`auth` / `policy` / `query` / `total`).
- Measured from Chennai after deploy: `x-vercel-id` `bom1::bom1`;
  `/health` in-process `total;dur=0–4`; warm TTFB ~180–460ms (was
  350–740ms via `iad1`). Invalid Bearer GET plans `auth;dur=0–1`.
- Deferred: IPv6 `ipv4first` (no ~3s connect stall); duplicate
  `users` read on `GET /auth/me`.

### 2026-08-18 — HTTP integration tests against local Docker Supabase

- Detour from Next up (3.3 health-sync). Product APIs unchanged.
- Seam: Supertest → `composeApp` → local GoTrue + Postgres. Loopback-only
  `SUPABASE_URL` guard. Never `pnpm db:reset-data` / hosted wipe.
- `supabase/config.toml` + OTP email templates (Mailpit `:54324`);
  `.env.integration.example`; `pnpm test:integration` (excluded from
  default `pnpm test`).
- 13 flow files under `src/app/tests/integration/` (auth through workout).
  Existing `*.routes.test.ts` + domain tests kept as-is.
- Deferred: CI Docker job; real `POST /auth/google/complete` with a Google
  identity (401 without Bearer is the live hit).

### 2026-08-17 — Sync Orbit: 3.2 done, next 3.3

- Orbit `roadmap-data.js` + `docs/mvp-roadmap/` mirror: 3.2 `done`; stint
  tagline next 3.3 health-sync. Lede + M7 items already API-live (3.2).
- Live: https://gym-prd-visual.vercel.app (deploy
  `dpl_Fs8vJuwahnMCuVHUb1qPYMZ9kmLY`).

### 2026-08-17 — Ship Stint 3.2 workout APIs

- Coaching: `GET /exercises/search` (seed, cap 20); assign/replace Client-owned
  `WorkoutPlan` (archive ACTIVE then insert days/exercises); staff GET
  definition; Client GET with gym-today `completed` flags; POST/DELETE
  complete ticks `workout_plan_exercise_completions` (not set logs).
- Public URLs use dedicated prefixes (`/exercises`, `…/workout-plans`,
  `…/my-workout-plan`) so Express 5 catch-alls cannot swallow leftover
  gym-org paths.
- Out of this stint: gym workout templates, CustomExercise, T8 adherence
  overlay, assign audit. Guide: `docs/coaching.md`. Postman Coaching folder
  extended with search/assign/GET/complete.

### 2026-08-17 — Fix GET trainers 404 (Express 5 catch-all)

- Live smoke: `GET /gym-orgs/:gymOrgId/trainers` 404 (`No route`) while
  staff-invites on the gym-org router still 200. Cause: coaching catch-alls
  `router.use('/gym-orgs/:gymOrgId', …)` on Express 5 swallowed leftover
  paths.
- Dedicated `createGymTrainersRouter` mounted at
  `/gym-orgs/:gymOrgId/trainers`. Diet templates at
  `/diet-plan-templates`; my plan at `/my-diet-plan` (same public URLs).
- Wired in `composition.ts` → `composition-root.ts` → `createRouter`.
  Tests: `gym-org-trainers-routing.test.ts` plus gym-org and coaching
  route mounts. Public URLs unchanged.

### 2026-08-17 — Sync-docs + Postman after trainer list

- README + Orbit `modules-data.js`: Admin gym trainer list marked live
  (A4 picker). Roadmap/Orbit lede unchanged — next remains **3.2**.
- Prod https://gym-prd-visual.vercel.app (modules-data deploy).
- Postman audit pass (`gapCount` 0). Git `gym-backend-postman` `ddffe43`
  already on origin. Cloud `putCollection` async
  `40791026-fdcd-4759-9227-92b0bc4848f6` — List Gym Trainers under Gym Orgs
  (not root); `updatedAt` `2026-08-17T11:49:17Z`.

### 2026-08-17 — Admin list gym trainers

- Detour before 3.2: `GET /gym-orgs/:gymOrgId/trainers` so Admin can
  pick `trainerProfileId` for assign (A4). Paginated; live
  `trainer_profiles` + user name/email/`staffCode`/`isAdmin`.
- gym-orgs query port + `ListGymTrainersUseCase`; Admin-only
  (`GYM_ORG_ADMIN_FORBIDDEN`). Tests: use case + routes.
- Docs: `api.md`, `client-auth.md`, `roster.md`, F3.4. Postman **Gym Orgs**
  — List Gym Trainers (200 + 403 Examples). Git `../gym-backend-postman`
  `ddffe43`; cloud folder-scoped create (not root). 3.2 workout APIs still
  next.

### 2026-08-17 — Sync-docs + Postman after T7

- Orbit/README/MVP: 3.1 copy now names gym diet templates; `roadmap-data.js`
  mirrored to `docs/mvp-roadmap/`. Prod
  https://gym-prd-visual.vercel.app (lede + 3.1 `status: "done"`).
- Postman: Coaching template CRUD/duplicate/assign-from-template Docs +
  403 Examples; audit `gapCount` 0. Git `../gym-backend-postman`
  `02af5fe`; cloud PUT async (`994021fe…` successful). Templates sit
  inside **Coaching**, not root.

### 2026-08-17 — Gym diet plan templates (T7 / ADR-0008)

- Detour before 3.2: trainer-owned gym `DietPlanTemplate` library. Assigned
  `diet_plans` stay Client-owned snapshots (`cloned_from_template_id`).
- Schema: `20260817102811_diet_plan_templates.sql` on
  `igcmptpjmagzwoccxcnw` (three tables + serving-matches trigger). DBML,
  types regen, ADR-0008.
- APIs under `coaching`: template CRUD / duplicate / list; assign XOR
  `{ templateId }` or meals body. Tests: entity, use-case, routes.
- Docs: CONTEXT, PRD T7/F6.4, nutrition.md, architecture §7, api.md.
  Postman Coaching folder: template CRUD + assign-from-template (meals-body
  request kept). Out: workout templates, client→client clone, CustomFood.

### 2026-08-17 — Push 3.1 + Postman Nutrition/Coaching

- Pushed gym-backend `feat: ship Stint 3.1 nutrition, diet, and exercise
  catalog` (`a7c50ca`).
- Postman: top-level **Nutrition** (search, diary, staff CALORIES) and
  **Coaching** (assign/get/complete diet). Docs + Examples audited
  (`gapCount` 0). Git `../gym-backend-postman` `5727c89`; cloud `Gym
  Backend API` folders verified (requests inside folders, not root).

### 2026-08-17 — Apply ADR-0007 + sync-docs (Orbit local)

- Applied `20260817120000_catalog_exercise` +
  `20260817121500_seed_exercise_catalog_v1` on `igcmptpjmagzwoccxcnw`
  (Management API SQL + `schema_migrations` history). Live:
  `exercise_items` 30, public tables 33, `workout_plan_exercises.name`
  dropped, `exercise_item_id` required, RLS on. Types regenerated;
  `tsc --noEmit` pass.
- Docs: 3.1 → Done on MVP_ROADMAP + Orbit `roadmap-data.js`; README /
  client-auth / api.md / product-flows API-status; modules M6/M9 live,
  M7 seed-live/APIs-next; lede next=3.2. Mirror copied to
  `docs/mvp-roadmap/roadmap-data.js`.
- Live Orbit deploy **not** updated: Vercel CLI `--token` from
  `auth.json` rejected; default `vercel --prod` returned Not authorized.
  Re-login then `npx vercel --prod --yes` from `docs/prd-showcase/`.

### 2026-08-17 — ADR-0007 catalog exercise + 30-seed (spec)

- Decision: no free-text exercise names; plan lines are `ExerciseItem`
  (movement × equipment + frozen muscle/equipment/measurement). Completions
  stay `PlanCompletion` — not Hevy set logs. CustomExercise columns exist;
  APIs deferred. Do not import Hevy/wger.
- Docs: `docs/adr/0007-catalog-exercise.md`, CONTEXT, PRD C6/T6/§5.5,
  product-flows M7, architecture §7/§12, MVP_ROADMAP + Orbit data.
- Schema: `exercise_items`; drop `workout_plan_exercises.name`; required
  `exercise_item_id`. Migrations written, **not applied**:
  `20260817120000_catalog_exercise.sql`,
  `20260817121500_seed_exercise_catalog_v1.sql` (30 rows).
- `pnpm db:reset-data` SQL/mjs now restore 30 exercises after truncate
  (requires the catalog migration applied first).

### 2026-08-17 — Hevy catalog research (primary sources)

- Wrote `docs/research-hevy-exercise-catalog.md` from Hevy API OpenAPI
  `0.0.1` (`api.hevyapp.com/docs`) + hevyapp.com feature/legal/help
  pages. Catalog vs Routine vs Workout vs Set; official muscle /
  equipment / `CustomExerciseType` enums; custom exercises =
  `is_custom` templates. Exact built-in count unknown (“400+” only).
- Explicit: do not scrape/copy Hevy titles or images. 3.2 still
  PlanCompletion + free-text `workout_plan_exercises.name`; a later
  `ExerciseItem` analog to `FoodItem` is research only.

### 2026-08-17 — Stint 3.1 nutrition + diet (20-food bootstrap)

- Applied `20260817101500_seed_food_catalog_v1` on `igcmptpjmagzwoccxcnw`
  (Management API): `food_serving_unit` enum, live unique `(food_item_id,
  unit)`, 20 seed foods × 8 units (160 servings). Types regenerated.
  `pnpm db:reset-data` now restores the catalog after truncate.
- Shared branded types: `FoodItemId`, `FoodServingId`, `FoodServingUnit`,
  `MealSlot`, `DietPlanMealItemId`, `ServingQuantity`.
- `src/features/nutrition/` — search seed only, extras diary, staff CALORIES
  read, `LogPrescribedFood` command port. No CustomFood / user macros.
- `src/features/coaching/` — diet assign/get + complete/uncomplete into the
  diary; assigned trainer / Admin-as-Trainer; freeze on expired
  `TRAINER_COACHING` addon. HTTP in [`docs/nutrition.md`](nutrition.md).
- Deferred: hundreds-row catalog, CustomFood, workout 3.2, NL/barcode/Snap,
  T8 adherence %, Postman sync, audit 3.6.

### 2026-08-17 — Apply ADR-0006 catalog/diary migration

- Applied `20260817094500_catalog_food_and_unified_diary` on
  `igcmptpjmagzwoccxcnw` via Management API SQL (CLI `db push` blocked:
  login-role Forbidden, no `SUPABASE_DB_PASSWORD`). History row version
  matches the local filename.
- Verified: `meal_slot` enum, `food_item_servings` (RLS on), diet
  completions table gone, serving-match triggers, `food_items` still 0.
  Public table count remains 32.
- Regenerated `src/infrastructure/supabase/database.types.ts` (`gen types
  --project-id`); Prettier + `tsc --noEmit` pass.
- **Not done:** food catalog seed. That is the next 3.1 step.

### 2026-08-17 — ADR-0006 catalog food + unified diary (spec)

- Decision: no free-text meal names; one catalog + one eaten-today diary;
  completing a diet item writes a plan-linked `CalorieLogItem`. CustomFood
  (structured) is the miss path. 3.1 = seed + diet + diary; 3.2 = workout.
- Docs: `docs/adr/0006-catalog-food-and-unified-calorie-diary.md`, CONTEXT,
  PRD C5/C9/§5.5/§5.10, product-flows M6/M9, architecture §7/§12,
  MVP_ROADMAP + Orbit `roadmap-data.js`.
- Schema: servings, `meal_slot` enum, required `food_item_id`/`serving_id`,
  drop `diet_plan_item_completions` / `custom_name` / `manual_description`.
  Migration `supabase/migrations/20260817094500_catalog_food_and_unified_diary.sql`
  written, not applied.

### 2026-08-13 — Postman: functional Story blurbs on all requests

- Prepended `**Story:**` (1–2 sentence actor/action/outcome) to all 60
  request descriptions in gym-backend-postman `e01816b`; technical bullet
  Docs unchanged beneath.
- sync-postman skill + `audit-docs-examples.mjs` now require Story at
  description start. Audit `gapCount: 0`.
- Cloud `putCollection` async task `1a14e760-a5e9-4acb-87ab-aed04cce31c5`
  successful — spot-checked Create Lead, Self Check-in, Assign Trainer.

### 2026-08-13 — Docs + Orbit sync for Stint 2 complete

- Brought README, client-auth, api, subscriptions, roster, product-flows into
  line with 2.1–2.4 shipped / next Stint 3 (3.1 coaching).
- Orbit: `prd-showcase` (+ `mvp-roadmap` mirror) Stint 2 tagline **2.1–2.4
  shipped**; modules M4/M5/M8 “API live”; lede → next is 3.1.
- Redeployed `gym-prd-visual` from `docs/prd-showcase/` (CLI session; auth.json
  token lacked team access) → https://gym-prd-visual.vercel.app

### 2026-08-11 — Postman: Attendance + Profile & Progress (Stint 2)

- gym-backend-postman `91d4aba`: top-level **Attendance** (5) + **Profile & Progress**
  (6); **List Renewals Due** under Subscriptions. Docs + Examples; audit
  `gapCount: 0`. Pushed; cloud `putCollection` async task
  `91e11015-551c-46b5-89e3-33dc50147475` successful — folders verified live.

### 2026-08-11 — Stint 2 complete (2.1–2.4)

- **2.1 Attendance** (`src/features/attendance/`): self check-in, Admin desk
  mark, gym-day / per-client / my history. Eligibility: ACTIVE +
  `!checkInBlocked` + unstarted-or-in-date BASE. First check-in starts BASE
  via `Subscription.startFromFirstAttendance` (composition-root port).
  Promoted `CalendarDate` to `src/domain/shared/`.
- **2.2–2.3 Users** (`src/features/users/`): `/me/profile` + progress logs +
  BMI; staff grant-gated profile/progress at
  `/gym-orgs/:gymOrgId/clients/:clientUserId/{profile,progress-logs}`.
- **2.4 Renewals**: `GET .../subscriptions/renewals-due` on memberships
  (Admin; BASE+ADDON labeled).
- Vitest: 179 tests green. Deferred: A8b, audit (3.6), push/jobs (3.5),
  Orbit redeploy (Postman Stint 2 synced separately).

### 2026-08-11 — Docs + Orbit sync for Stint 1 complete

- Brought README, client-auth, subscriptions, membership-invites,
  product-flows, MVP_ROADMAP into line with 1.1–1.6 shipped / next Stint 2.
- Orbit: `prd-showcase` (+ `mvp-roadmap` mirror) marks **1.6 done**;
  modules M3/M4 “API live”; Orbit lede → next is 2.1 attendance.
- Redeployed `gym-prd-visual` from `docs/prd-showcase/`.

### 2026-08-11 — Postman: Roster folder (1.6)

- gym-backend-postman `431dd36`: top-level **Roster** — List Gym Members,
  List My Assigned Members, Assign Trainer, Offboard Member, Set Check-in
  Block (bullet Docs + Examples); var `trainerProfileId`.
- Audit `gapCount: 0`. Cloud putCollection async successful; Roster verified.

### 2026-08-09 — Stint 1 Phase 5: roster / assign / offboard / block

- Extended `src/features/memberships/` for roadmap 1.6 / PRD A3, A4, A15, A18,
  C3: `GET .../members`, `GET .../my-assigned-members`,
  `POST .../members/:id/assign-trainer`, `POST .../offboard`,
  `PATCH .../check-in-block`.
- Domain: `ClientMembership` transitions + `assignedTrainerId`;
  `Subscription.isInDate` + coaching-addon command lookup; `LiveTrainerProfilePort`
  wired from gym-orgs at composition-root.
- Migration: `offboard_client_membership` RPC (INACTIVE + clear all grants).
- Vitest domain + UC + routes. Docs: `docs/roster.md`; api / invites / roadmap.
- Deferred: A8b attach/renew; attendance enforcement of block; push; Postman
  roster folder. Remote `offboard_client_membership` verified via MCP.

### 2026-08-09 — sync-postman skill: Docs + Examples every run

- Updated [`.cursor/skills/sync-postman/SKILL.md`](../.cursor/skills/sync-postman/SKILL.md):
  mandatory refresh of bullet-list property Docs + saved Examples on every
  sync; no early exit on structure-only match; Postman tables forbidden.
- Added `scripts/audit-docs-examples.mjs` (exit 1 on gaps) and
  `add-subscriptions-folder.mjs`.
- gym-backend-postman: `29aa1e6` (bullet docs) then `ca849e0` (**Subscriptions**
  folder — list/payment/start-override/my-subscriptions + Examples).
- Cloud putCollection async **successful**; Subscriptions verified under folder.

### 2026-08-09 — Stint 1 Phase 4 core: subscription Admin APIs + C10

- Extended `src/features/memberships/` for roadmap 1.5 core / PRD A8, A19, C10:
  `GET .../clients/:clientUserId/subscriptions`,
  `PATCH .../subscriptions/:id/payment`,
  `POST .../subscriptions/:id/start-override`,
  `GET .../my-subscriptions`.
- Domain: `Subscription` entity (`setPayment`, `overrideStart` unstarted BASE
  only); `CalendarDate`; CQRS ports; reuse `PlanAdminPolicy`.
- No new migration — existing `subscriptions` CHECKs / exclusion (ADR-0004).
- Vitest domain + UC + routes. Docs: `docs/subscriptions.md`; api/client-auth/
  product-flows/roadmap/Orbit marked 1.5 core done.
- Deferred: A8b addon attach, renew-as-new-row, Phase 5 roster, Postman smoke.

### 2026-08-09 — Postman collection property docs

- Synced per-property tables (enums + string examples) into Postman
  **Gym Backend API** — all 39 requests’ Docs panels + query-param
  descriptions where applicable.
- Git export updated in sibling repo `gym-backend-postman`
  (`Gym-Backend-API.postman_collection.json`, README).
- Cloud workspace collection updated via Postman API
  (`updateCollectionRequest`).

### 2026-08-09 — Full API property docs

- Added thin index [`docs/api.md`](api.md) linking all shipped endpoints.
- Enriched [`docs/client-auth.md`](client-auth.md) and
  [`docs/membership-invites.md`](membership-invites.md) with per-property
  tables (request/query/path/response; enums + string examples).
- New [`docs/leads.md`](leads.md) and [`docs/plans.md`](plans.md) for Admin
  Mini-CRM and plan catalog (previously Postman-only).
- Cross-links between api / client-auth / plans / membership-invites / leads.
- No runtime or schema changes.

### 2026-08-08 — PRD showcase reading modals + deeper module detail

- Shared large reading modal (`reader-modal.js` / `.css`) for Product + Orbit
  2D/3D: Esc/backdrop/close, focus trap, optional TOC.
- Hero **Read full PRD** opens curated `prd-reader-data.js` (PRD §§1–11).
- Modules: `modules-data.js` adds summary / how-it-works + full-detail modal
  per M1–M13 (outline unchanged).
- Orbit: `detail` on roadmap items; dock **Read detailed view** in 2D + 3D.
- Redeploy `gym-prd-visual` from `docs/prd-showcase/`.

### 2026-08-08 — Docs + PRD showcase synced to Phase 3

- Marked Mini-CRM PF.1–PF.4 and Stint 1.1–1.4 as **shipped** in
  `docs/MVP_ROADMAP.md` + `prd-showcase/roadmap-data.js` (synced to
  `mvp-roadmap/`). Orbit 2D/3D show done nodes as shipped; run sheet badges.
- Product tab module copy notes API-live vs next; Orbit hero/dock copy updated.
- Integration docs: `client-auth.md` CLIENT surface table; `membership-invites.md`
  status links; `product-flows.md` API status on M1–M4/M11; `PRD.md` delivery row;
  `README.md` rewritten past boilerplate.
- Redeploy `gym-prd-visual` from `docs/prd-showcase/` to publish Orbit/Product
  (local files updated; live host refresh when Vercel deploy succeeds).

### 2026-08-08 — Membership invites docs + Postman Examples

- Added `docs/membership-invites.md` — Admin create/list/revoke, Client
  inbox/accept, my-data-grants request/response examples + error codes.
- Postman **Membership Invites**: saved Examples on all 7 requests; README
  links to the guide; cloud sync via `putCollection` after git push.

### 2026-08-08 — Stint 1 Phase 3: client inbox + accept + DataGrants

- Extended `src/features/memberships/` for roadmap 1.3–1.4 / PRD C2–C2c:
  `GET /membership-invites/inbox`, `POST /membership-invites/:id/accept`,
  `GET`/`PUT /gym-orgs/:gymOrgId/my-data-grants`.
- Migration `accept_membership_invite` RPC (applied remote): atomic ACTIVE
  `client_memberships` + base (± addon) subscription snapshots + required
  DOB/HEIGHT/WEIGHT grants + optional checklist; single-ACTIVE enforced.
- Domain: invite accept/expiry asserts; `ClientMembership`; grant ports
  (CQRS). Required grants sticky on PUT. Vitest domain + UC + routes.
- Deferred: Phase 4 Admin subscription manage APIs; Phase 5 roster/offboard;
  invite email/push; Postman sync for new client routes (smoke after phases).

### 2026-08-08 — Stint 1 Phase 2: membership invite create/list/revoke

- Extended `src/features/memberships/` with Admin membership invites
  (PRD A6 / roadmap 1.2): `POST`/`GET`
  `/gym-orgs/:gymOrgId/membership-invites`,
  `POST .../:inviteId/revoke`.
- Domain: `MembershipInvite` PENDING→REVOKED; email normalize; optional
  CLIENT `invited_user_id` via `ClientUserLookup`; base BASE + optional
  TRAINER_COACHING ADDON validation on active plans. Authz reuses
  `PlanAdminPolicy`. No migration — table already applied. No email/push.
- Vitest domain + use-case + route coverage. Postman folder
  **Membership Invites**.
- Deferred: client inbox/accept, DataGrants, subscriptions, roster
  (Phases 3–5); outbound invite email; A14 lead convert.

### 2026-08-08 — Postman docs + Examples for Leads and Plans

- Cloud collection `Gym Backend API` (My Workspace): enriched request
  descriptions for all **Leads** (7) and **Plans** (6) endpoints to match
  Gym Orgs style (auth, body fields, success/error codes).
- Added 19 saved Examples (success + key errors: soft phone warn,
  `LEAD_FORBIDDEN` / `PLAN_FORBIDDEN`, `NOT_FOUND`, validation).
- Git export `../gym-backend-postman` collection JSON updated in lockstep.

### 2026-08-08 — PRD showcase rehosted as `gym-prd-visual`

- Deleted exposed Vercel project `prd-showcase` (old URL now 404).
- Recreated as `gym-prd-visual`
  (`prj_EtVPC7ovvVam8sXPcfdePCZbwblP`) from `docs/prd-showcase/`.
- Live: [gym-prd-visual.vercel.app](https://gym-prd-visual.vercel.app)
  (Product · Roles · Orbit). Doc links updated in PRD / permissions /
  MVP_ROADMAP + redirect HTML stubs.

### 2026-08-08 — Stint 1 Phase 1: plan catalog CRUD

- Shipped `src/features/memberships/` plan catalog (PRD A7 / roadmap 1.1):
  create/list/get/update/soft-delete under `/gym-orgs/:gymOrgId/plans`.
- Domain: `MembershipPlan` enforces BASE⇔no capability, ADDON⇔
  `TRAINER_COACHING`; kind/capability immutable after create; soft-delete via
  `deleted_at`. Authz: ADMIN + `LiveGymAdminPort` (composition-root wire).
- No migration — table/enums already applied. Vitest domain + use-case +
  route coverage. Postman folder **Plans**.
- Deferred: invites, accept, DataGrants, subscriptions, roster (Phases 2–5).

### 2026-08-07 — Prettier CI fix + Husky hooks

- Formatted the 7 files that failed GitHub Actions `format:check` (gym-orgs
  composition + leads use cases / routes / route tests).
- Added `husky` + `lint-staged`: pre-commit formats staged files; pre-push runs
  `format:check`, `typecheck`, `lint`, and `test` to catch CI failures locally.

### 2026-08-07 — Staff invite inbox embeds gym profile

- `GET /gym-orgs/staff-invites/inbox` items now include nested `gym`
  (`id`, `name`, `address`, `contactPhone`, `contactEmail`, `logoUrl`,
  `timezone`) via `StaffInviteQueries.listInboxForUser` inner join on
  live `gym_orgs`. Admin list / create / accept / revoke unchanged.
- Docs: `client-auth.md`, `product-flows.md` F2.2; Postman inbox example.

### 2026-08-07 — Mini-CRM leads APIs (A11–A13)

- Shipped `src/features/leads/`: create/list/get/update/soft-delete;
  `PATCH .../status` pipeline; soft `DUPLICATE_OPEN_LEAD_PHONE` warn on
  create/update (command-repo lookup); `followUpDate` + due-follow-ups query.
- Routes: `/gym-orgs/:gymOrgId/leads` (feature-owned router). Authz: ADMIN +
  live admin via `LiveGymAdminPort` from gym-orgs composition.
- Promoted `GymOrgId` to `src/domain/shared/gym-org-id.ts` (gym-orgs re-exports).
- Vitest: domain + use-case + route coverage. Postman folder **Leads**.
- Deferred: A14 convert → membership invite; push/inbox follow-up delivery.

### 2026-08-07 — Pull Mini-CRM ahead of Stint 1 (docs)

- Decision: implement Mini-CRM (`leads`, A11–A13) as one chunk before
  memberships/plan catalog. Gym-owned; only depends on shipped gym-orgs + Admin.
- Updated [`MVP_ROADMAP.md`](MVP_ROADMAP.md) Pull-forward section; Orbit
  `roadmap-data.js` + run sheet; [`product-flows.md`](product-flows.md) M11
  build scope. A14 + push reminders stay deferred until Stint 1 / 3.5.

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
