# MVP Execution Roadmap

> **Agents:** Prefer this over inventing build order. Visual companion:
> [`docs/prd-showcase/`](prd-showcase/) **Orbit** tab (live:
> [gym-prd-visual.vercel.app/#orbit](https://gym-prd-visual.vercel.app/#orbit)).
> Source of truth for product behavior remains [`PRD.md`](PRD.md); stage status stays in
> [`PROGRESS.md`](PROGRESS.md).

**Scope:** Backend API MVP in this repo (`src/features/*`), mapped to PRD modules M3–M13.
Schema already exists (32 tables). Remaining work is feature modules, not greenfield DB design.

**Rule:** Finish a stint’s exit criteria before starting the next. Items inside a stint are
listed in build order — do them one by one.

**Exception (closed):** One documented **pull-forward** (Mini-CRM A11–A13) ran between
Foundation and Stint 1 and is now **shipped**. Do not invent further reorders without
updating this file + Progress + Orbit `roadmap-data.js`.

```
Foundation (shipped)
  → Pull-forward: Mini-CRM A11–A13 (shipped)
  → Stint 1 Open the Floor — 1.1–1.6 shipped; next Stint 2
  → Stint 2 Run the Desk
  → Stint 3 Keep Them Coming (CRM remainder + rest)
```

---

## Foundation (shipped)

| Module | Feature | Status |
|--------|---------|--------|
| M1 Identity | `src/features/auth` | Done — OTP, Google, refresh, `/me`, provisioning |
| M2 Gym Org | `src/features/gym-orgs` | Done — create/list/get/patch, staff invite lifecycle |

---

## Pull-forward (shipped) — Mini-CRM

**Why then:** Self-contained gym-owned module; depended only on shipped Auth + gym-orgs.
Finished a wedge slice in one chunk before memberships complexity.

**Outcome:** Admin can capture leads, move the pipeline, set follow-up dates, and list
due follow-ups. Soft warn (not hard-block) on duplicate open-lead phone at the same gym.

| # | Work item | Paths | PRD | Ownership | Status |
|---|-----------|-------|-----|-----------|--------|
| PF.1 | Leads CRUD + soft-delete + gym-scoped list/get | `src/features/leads/` | A11 | Gym-owned | Done |
| PF.2 | Status pipeline New → Contacted → Trial → Converted → Lost | `leads` | A12 | Gym-owned | Done |
| PF.3 | Soft duplicate-phone warn on create/update (open leads) | `leads` | A11 | Gym-owned | Done |
| PF.4 | `follow_up_date` set/clear + Admin due-list query | `leads` | A13 (store + query) | Gym-owned | Done |

**Exit criteria:** Staff Admin OTP → gym org → create lead → pipeline move → due list
returns follow-ups; duplicate open phone returns a soft warning payload (still saves).

**Explicitly out of this pull-forward:**

| Deferred | Until | Why |
|----------|-------|-----|
| A14 Convert lead → membership invite (pre-filled) | Stint 3.4 | Invites exist; convert UX still deferred |
| Push / in-app / web-inbox follow-up reminders | Stint 3.5 | Needs notifications + jobs |

Stint 3 keeps a **CRM remainder** row for A14 + reminder delivery (see 3.4).

---

## Stint 1 — Open the Floor (join + money)

**Outcome:** Admin can sell a plan, invite a client, client can accept with grants; gym has a live roster.

**Current:** 1.1–1.6 shipped (roster / offboard / block). Next: Stint 2. A8b addon attach / renew deferred within 1.5.

| # | Work item | Paths | PRD | Ownership | Status |
|---|-----------|-------|-----|-----------|--------|
| 1.1 | Plan catalog CRUD (`BASE` / `ADDON` + `TRAINER_COACHING`) | `src/features/memberships/` | A7 | Gym-owned | Done |
| 1.2 | Membership invite create / list / revoke | `memberships` | A6, C2 | Gym-owned | Done |
| 1.3 | Client invite inbox + accept → ACTIVE membership | `memberships` | C2 | Gym-owned | Done |
| 1.4 | DataGrants on accept (required DOB/HEIGHT/WEIGHT) + manage while ACTIVE | `memberships` | C2b, C2c | Client consent | Done |
| 1.5 | Subscriptions: Admin payment status + start override + Client list. Accept already snapshots lines. Addon attach / renew deferred. | `memberships` | A8, A19, C10 (A8b later) | Gym-owned | Done (core) |
| 1.6 | Roster + trainer assign/reassign (addon-gated) + offboard + block check-in | `memberships` | A3, A4, A15, A18, C3 | Gym-owned | Done |

**Exit criteria:** Staff OTP → create org → create BASE plan → invite client → client accept + grants → roster shows ACTIVE; assign / offboard / block work; single-ACTIVE invariant enforced.

**Client integration (shipped through 1.6):** [`client-auth.md`](client-auth.md) · [`membership-invites.md`](membership-invites.md) · [`subscriptions.md`](subscriptions.md) · [`roster.md`](roster.md)

---

## Stint 2 — Run the Desk (daily ops)

**Outcome:** Desk and Client can run a normal gym day without coaching (CRM may already exist via pull-forward).

| # | Work item | Paths | PRD | Ownership | Status |
|---|-----------|-------|-----|-----------|--------|
| 2.1 | Client self check-in + Admin desk mark + logs | `src/features/attendance/` | C4, A5 | Gym-owned | Todo |
| 2.2 | Client profile edit + ProgressLog + BMI | `users` / progress slice | C7, C8, C14 | Client-owned | Todo |
| 2.3 | Grant-gated staff reads of profile/progress | policies on query use cases | T4, A17 | Client-owned (gated) | Todo |
| 2.4 | Renewals due-list / expiring-soon Admin query (read model; no push yet) | `memberships` queries | A9 | Gym-owned | Todo |

**Exit criteria:** ACTIVE member with in-date base can check in; Admin can desk-mark and list renewals; staff see Client-owned fields only when granted.

---

## Stint 3 — Keep Them Coming (wedge + retention)

**Outcome:** Full MVP loop — coaching differentiator, Client fitness, CRM convert + nudges.

| # | Work item | Paths | PRD | Ownership | Status |
|---|-----------|-------|-----|-----------|--------|
| 3.1 | Coaching: diet + workout assign + per-day completions | `src/features/coaching/` | C5–C6, T5–T6 | Client-owned plans | Todo |
| 3.2 | Food catalog seed + calorie log (+ NL/qty parser) | `src/features/nutrition/` | C9 | Client-owned (+ catalog seed) | Todo |
| 3.3 | Health sync ingest/read APIs (provider adapters) | `src/features/health-sync/` | C12 | Client-owned | Todo |
| 3.4 | CRM remainder: A14 convert lead → membership invite; follow-up *delivery* via 3.5 | `leads` + invites | A14 (+ A13 push) | Gym-owned / platform | Todo |
| 3.5 | Notifications + scheduled jobs (T-2 renewals, unpaid digest, lead follow-ups) | `src/features/notifications/` + jobs | C11, A10, A10b, M12 | Platform | Todo |
| 3.6 | Audit trail writes for sensitive ops (payments, desk attendance, blocks, grants) | cross-cutting in use cases | M13 | Platform | Todo |

**Exit criteria:** Solo owner can run renewals inbox + CRM convert + (self-)coaching; Client can log food, sync health, complete plans; T-2 / unpaid / lead-follow-up jobs fire idempotently.

**Note:** Core Mini-CRM A11–A13 is the **Pull-forward** above (shipped) — do not rebuild it in 3.4.

---

## Out of orbit (deferred)

Not in these three stints — do not pull forward unless a concrete blocker appears:

- Feature-scoped RLS (service-role API for now)
- Verified domain + transactional SMTP off personal Gmail
- Push notifications for staff invites
- Logo upload / branding storage
- WhatsApp / SMS reminders
- Payment gateway
- QR / geofence check-in
- DPDP erasure UX
- Open join codes / maps directory

---

## Visual site

Open the Capability Orbit in the PRD showcase (Product · Roles · Orbit + 3D):

```bash
npx --yes serve docs/prd-showcase -p 5177
# Product / Roles / Orbit:  http://localhost:5177/
# 3D Orbit:                 http://localhost:5177/orbit-3d.html
```

Live: [gym-prd-visual.vercel.app](https://gym-prd-visual.vercel.app)

- Shared data: [`prd-showcase/roadmap-data.js`](prd-showcase/roadmap-data.js) (keep in sync with this file)
- Legacy duplicate folder [`mvp-roadmap/`](mvp-roadmap/) mirrors the same `roadmap-data.js` for old bookmarks — prefer `prd-showcase/`

Update the markdown and `roadmap-data.js` together when the execution sequence changes
(including pull-forwards); refresh [`PROGRESS.md`](PROGRESS.md) Current stage when a
stint item or pull-forward ships.
