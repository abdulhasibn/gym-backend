# Product Requirements Document (PRD)
## Gym Management SaaS — MVP

| | |
|---|---|
| **Status** | Draft v2.3 (client-owned data + grants grill) |
| **Date** | August 1, 2026 |
| **Owner** | Product Team |
| **Supersedes** | Gym SaaS MVP PRD Draft v2.2 |
| **Launch geography** | India-first |
| **Platforms** | Mobile (iOS + Android), Web (Admin-primary) |
| **Stack** | React Native (mobile) · Next.js (web) · Node/Express (API) · Supabase (DB + Auth) |

---

## 1. Purpose & Background

This PRD scopes the production MVP for a gym management SaaS with three hard-coded personas — **Client, Trainer, Admin**. The product replaces spreadsheets/registers for small Indian gyms: memberships, attendance, renewals, leads, and trainer-led diet/workout coaching, plus a Client app for plans, progress, calorie logging, and health-app sync.

### 1.1 Positioning (locked)

| Decision | Choice |
|---|---|
| **Buyer** | Admin (gym owner/manager) |
| **Wedge** | Subscription renewal tracking + mini-CRM + desk ops |
| **Retention differentiator** | Trainer (or Admin-as-Trainer) diet + workout programming |
| **Beachhead customer** | Solo / small owner-operator gyms |
| **Delivery** | Big-bang production app (not a PoC). Showcase to gym owners → feedback → round-2 hardening. AI-assisted build. |

### 1.2 App blueprint — modules & submodules

> **Visual showcase (source in repo):** [`docs/prd-showcase/`](prd-showcase/) — open `index.html` locally. Live: [prd-showcase.vercel.app](https://prd-showcase.vercel.app).  
> **UI / product flows brief:** [`docs/product-flows.md`](product-flows.md) — module-by-module screens, journeys, grants, and empty states for Client / Trainer / Admin.

High-level shape of the product. Surfaces consume shared domain modules via the API.

#### Surfaces

| Surface | Stack | Role |
|---|---|---|
| **S1 Mobile** | React Native | Client + Trainer core flows; light Admin; live Apple Health / Health Connect / Samsung Health |
| **S2 Web Admin** | Next.js | Dashboards, renewals inbox, CRM pipeline, roster tables, desk attendance, plan catalog |
| **S3 API & data** | Express + Supabase | Auth (email OTP), tenancy, jobs, push, owned Indian food catalog, audit trail |

#### Domain modules (M1 → M13)

```
gym-saas
├── Surfaces
│   ├── Mobile (React Native) ………… Client + Trainer (+ light Admin)
│   ├── Web (Next.js) ………………… Admin-primary (CRM, renewals, tables)
│   └── API (Express) + Supabase …… DB, Auth, jobs, push
│
├── M1  Identity & Access
│   ├── Email OTP auth (canonical, free transactional email)
│   ├── Google OAuth + email link
│   ├── Frozen roles + permissions (CLIENT / STAFF lanes)
│   └── Admin-as-Trainer capability
│
├── M2  Gym Organization
│   ├── GymOrg create / profile / branding / timezone
│   ├── Client membership invites (email / in-app list)
│   ├── Staff invites (staff_code / QR; Trainer & desk Admin)
│   └── Ownership (owner_user_id; multi-org in DB, single-gym UI)
│
├── M3  Members & Memberships
│   ├── Membership invite → accept → ACTIVE membership
│   ├── In-app invitation list (client + staff)
│   ├── Roster (ACTIVE / INACTIVE)
│   ├── Trainer assignment / reassignment (requires active Trainer addon)
│   ├── DataGrants (profile attributes + class grants; no copy)
│   ├── Offboard client (clears grants; attendance retained)
│   └── Block check-in (Admin safety valve)
│
├── M4  Plans & Billing Status
│   ├── Plan catalog: Admin-named; kind BASE | ADDON; ADDON capability
│   ├── Base subscription (required) + optional addon lines
│   ├── Price/duration snapshot on subscription line
│   ├── Payment status (paid / unpaid / partial) per line
│   ├── Base start (first attendance | Admin override); addon start (attach day)
│   ├── End date / renewals list (base + addon, labeled)
│   ├── T-2 renewal reminders (push + in-app + Admin inbox)
│   └── Daily Admin nudge: unpaid / partial lines
│
├── M5  Attendance
│   ├── Client self check-in
│   ├── Admin desk mark
│   ├── Per-client / per-day / gym-wide logs
│   └── (Out: Trainer log, QR, geofence)
│
├── M6  Coaching — Diet
│   ├── Structured meals / slots / targets
│   ├── Free-text notes
│   ├── Assign to client (requires active Trainer addon)
│   ├── Per-day PlanCompletion; staff adherence needs DIET_PLANS grant
│   └── Clone / template (P1 UI)
│
├── M7  Coaching — Workout
│   ├── Days → exercises → sets/reps
│   ├── Free-text notes
│   ├── Assign to client (requires active Trainer addon)
│   ├── Per-day PlanCompletion; staff adherence needs WORKOUT_PLANS grant
│   └── Clone / template (P1 UI)
│
├── M8  Progress & Body Metrics (Client-owned + grants)
│   ├── Weight / BMI (ProgressLog canonical; profile current)
│   ├── Attendance history (gym-owned view)
│   ├── Plan adherence % (staff needs class grant)
│   └── Profile (height, DOB, gender, medical notes)
│
├── M9  Nutrition (Client-owned)
│   ├── Owned Indian FoodItem catalog
│   ├── NL / qty parser (“2 idlis, 1 omelette”)
│   ├── Daily calorie / macro log vs target
│   └── Manual entry fallback
│
├── M10 Health Sync (Client-owned)
│   ├── Apple Health (HealthKit)
│   ├── Google Health Connect
│   ├── Samsung Health
│   └── Sync: steps, workouts, active calories, weight
│
├── M11 Mini-CRM (Admin)
│   ├── Lead capture (soft duplicate phone warn)
│   ├── Pipeline (New → Contacted → Trial → Converted → Lost)
│   ├── Follow-up reminders
│   └── Convert → membership invite (P1)
│
├── M12 Notifications & Inbox
│   ├── Push (FCM / APNs)
│   ├── In-app notifications
│   ├── Admin web inbox (renewals, lead follow-ups)
│   └── (Out: WhatsApp / reminder SMS)
│
└── M13 Platform / Shared
    ├── Tenancy (gym_org_id scoping)
    ├── Audit trail (payments, plans, desk attendance, blocks)
    ├── Scheduled jobs (T-2 renewals, unpaid digest, follow-ups)
    └── File/branding storage (logo, etc.)
```

#### Who uses what (MVP)

| Module | Client app | Trainer app | Admin web |
|---|:---:|:---:|:---:|
| M1 Identity | ● Primary | ● Primary | ● Primary |
| M2 Gym Org | Invitation list | Staff invite accept | ● Primary |
| M3 Members | Accept invite / DataGrants | Assigned roster | ● Primary |
| M4 Plans & billing | View base + addons + renewal banners | — | ● Primary |
| M5 Attendance | Self check-in | View | ● Desk mark |
| M6–M7 Coaching | If active PT addon: view + complete; else hide / history read-only | ● Primary (gated) | As Trainer (gated) |
| M8 Progress | ● Primary (Client-owned) | If `PROGRESS` grant | If granted |
| M9 Nutrition | ● Primary (Client-owned) | If `CALORIES` grant | If granted |
| M10 Health sync | ● Primary (Client-owned) | If `WEARABLES` grant | If granted |
| M11 CRM | — | — | ● Primary |
| M12 Notifications | ● Primary | ● Primary | ● Inbox |
| M13 Platform | ◐ Via API | ◐ Via API | ◐ Via API |

● = primary · ◐ = consumed indirectly via API

#### Out of this blueprint (deferred)

Shadow profiles · Payment gateway · WhatsApp reminders · Maps gym directory · Barcode food scan · Third-party nutrition APIs · QR / geofence check-in · Facebook login · Hindi UI · Multi-branch switcher UI · RBAC / custom roles · Class booking · POS

### 1.3 Decisions carried from scoping

- **Multi-gym single-subscription roaming is OUT.** A client has at most one `ACTIVE` membership at a time.
- **Client-owned personal data + DataGrants are IN MVP.** Profile, progress, calories, wearables, and assigned diet/workout plan instances (with per-day completions) are owned by the User — never copied into a gym. Staff read via explicit grants only (see §5.12, ADR-0002). Gym-owned: membership, invites, subscriptions, attendance, leads.
- **Roles are system-seeded and frozen** (`roles` + `role_permissions` lookup; `users.role_id`). Codes: `CLIENT`, `STAFF_UNASSIGNED`, `TRAINER`, `ADMIN` with lane `CLIENT` | `STAFF`. Gyms cannot edit roles/permissions. Runtime authz = **affiliation ∧ permission code ∧ DataGrant** (where the data is Client-owned). Not customer RBAC.
- **No Client + Staff on one account.** Signup chooses lane; need both hats → two accounts. **Admin-as-Trainer** (staff lane) remains — `gym_admins` + `trainer_profiles`.
- **Admin may also act as Trainer** in their own Gym Org — required for solo owner-operators.
- **Multiple Admins per Gym Org** allowed (one owning Admin + invited desk Admins; small cap, e.g. max 3).
- **No shadow profiles.** Client exists as a member only after accepting a **membership invite** (creates User if needed + ACTIVE membership).
- **Join path is Admin membership invite only** (in-app invitation list + email/link). **No open gym join codes** in MVP. No maps / public directory.
- **Soft deletes** use `deleted_at timestamptz NULL` (null = live) on mutable entities. `audit_logs` and frozen `roles` / `role_permissions` are exempt. **DPDP erasure** is a separate privileged hard-delete/anonymize procedure (ADR-0003) — not normal app soft-delete.
- **Email + OTP is canonical identity** (sent via a free transactional-email provider, e.g. Supabase Auth email OTP / Resend / Brevo free tier — no per-message SMS cost). Google OAuth is secondary and must link/verify an email before membership activates. Facebook is out of MVP.
- **Phone number is optional contact info only** — captured at walk-in enrollment and lead capture for calling members, but not used for authentication or as a unique identity key. Duplicate lead phones at one gym are allowed (soft warning in app).
- **Data model allows one owner → many GymOrgs**; MVP UI is single-gym only (no branch switcher).
- **Billing is base + addons.** Admin creates named plans tagged `BASE` or `ADDON`. Every member needs an active **base** subscription; coaching (trainer + diet + workout) requires an active **`TRAINER_COACHING`** addon. Subscription lines snapshot price/duration; overlapping in-date lines are unrepresentable in the DB (ADR-0004). See §5.13.
- **Timestamps** stored UTC; **calendar-day rules** for gym ops use `gym_orgs.timezone` (default `Asia/Kolkata`). Plan-completion days use the assigning gym’s timezone.

---

## 2. Goals

- Let an **Admin** stand up a gym, invite trainers/desk Admins, manage clients, attendance, subscriptions, and leads.
- Let a **Trainer** (or Admin-as-Trainer) manage an assigned roster and deliver structured diet + workout plans with notes.
- Let a **Client** accept an Admin membership invite, manage DataGrants, check in, follow plans, track progress (including BMI), log meals via natural-language Indian food search, and sync Apple Health / Google Health Connect / Samsung Health.
- Automate **subscription renewal reminders** (T-2 days).
- Give Admin a lightweight **CRM** for leads.

### 2.1 Non-goals (explicitly out of MVP)

- Client belonging to / checking into multiple gyms under one subscription.
- Automatic grant inheritance when joining a new gym (each gym needs a fresh checklist).
- Shadow / Admin-only client profiles that never install the app.
- Customer-editable roles or gym-defined RBAC (system roles/permissions are frozen seeds only).
- In-app payment gateway collection (track payment **status** only; Admin-recorded).
- WhatsApp Business / SMS marketing reminders (push + in-app only; WhatsApp is first post-feedback channel).
- Maps-based gym discovery / public directory; open gym join codes.
- Barcode food scanning; third-party nutrition APIs (Nutritionix/Edamam/etc.).
- Facebook login.
- Marketing automation, franchise hierarchy UI, POS/retail, class scheduling/booking.
- AI-generated diet/workout plans (trainer builds manually; AI may bootstrap the **food DB** only).
- QR/geofence-verified attendance (self + Admin desk check-in only).
- Full Hindi/i18n UI (English only).
- Multi-location branch switcher UI (DB may support multiple orgs per owner).

---

## 3. Personas & Roles

| Role | Who | Created by | Notes |
|---|---|---|---|
| **Admin** | Gym owner/manager / desk staff | Owner self-registers (STAFF lane) and creates Gym Org; additional Admins via **staff invite** (existing STAFF account + `staff_code` / QR) | Owner retains `owner_user_id`. Cap ~3 Admins. Admin **may also train** in the same org. |
| **Trainer** | Gym staff trainer | **Staff invite** to an existing STAFF-lane account (`staff_code` / QR) | Affiliation via `trainer_profiles`. Signup role starts as `STAFF_UNASSIGNED` until first accept. |
| **Client** | Gym member | **Membership invite** (email / in-app list) → accept in app | Belongs to at most one `ACTIVE` membership. CLIENT lane only. |

Signup sets **lane** via frozen role (`CLIENT` vs `STAFF_UNASSIGNED`). Gym powers come from affiliations + `role_permissions`. **Admin-as-Trainer** = Admin also gets a `trainer_profiles` row (same account).

---

## 4. MVP Feature Scope by Persona

### 4.1 Client

| # | Feature | Priority |
|---|---|---|
| C1 | Sign up / log in via **email + OTP** (canonical, free transactional email); Google OAuth secondary with mandatory email link/verify | P0 |
| C2 | See **membership invites** in-app (and email/link); accept to join — Admin-issued only | P0 |
| C2b | On accept: required profile grants (**DOB, HEIGHT, WEIGHT**) + optional checklist for other profile attributes and class grants (`PROGRESS`, `CALORIES`, `WEARABLES`, `DIET_PLANS`, `WORKOUT_PLANS`); no data copy — grants only | P0 |
| C2c | Manage DataGrants for each gym (grant/revoke classes and optional profile attributes) while membership is ACTIVE | P0 |
| C3 | Get assigned to a trainer (by Admin) when an active Trainer addon exists | P0 |
| C4 | Log attendance (self check-in) | P0 |
| C5 | View assigned diet plan; mark meals/items complete **per calendar day** — only with active Trainer addon; prior plans read-only after addon expires | P0 |
| C6 | View assigned workout plan; mark exercises/sessions complete **per calendar day** — same entitlement rules as C5 | P0 |
| C7 | View own progress (attendance history, weight trend, plan adherence) | P0 |
| C8 | BMI from profile height + current weight (current weight maintained from ProgressLog) | P0 |
| C9 | Calorie counter — natural-language / common-food entry against **own Indian food API** (e.g. “2 idlis, 1 omelette”); manual calorie entry always available; **no barcode** | P0 |
| C10 | View base subscription + any addons (status, renewal due dates) | P0 |
| C11 | Receive renewal reminder (T-2 days) for base and addon lines — push + in-app | P0 |
| C12 | Connect **Apple Health / Google Health Connect / Samsung Health** — live read sync of steps, workouts, active calories, weight | P0 |
| C14 | Edit profile (height, weight, DOB, gender, medical notes/injuries); weight edits also write today’s ProgressLog | P0 |
| C15 | Request account **erasure** (DPDP) — privileged path; see ADR-0003 | P1 |

### 4.2 Trainer

| # | Feature | Priority |
|---|---|---|
| T1 | Sign up / log in as **STAFF** lane (`STAFF_UNASSIGNED`); email OTP / Google + email; receive **`staff_code` / QR** | P0 |
| T2 | Accept **staff invite** into a Gym Org (→ `TRAINER`) | P0 |
| T3 | View list of assigned clients | P0 |
| T4 | View a client's granted profile fields, BMI (if height+weight granted), progress (if `PROGRESS`), and attendance (gym-owned) | P0 |
| T5 | Create and assign a diet plan (structured + notes) — active `TRAINER_COACHING` addon; assign/edit definition does **not** require `DIET_PLANS` grant | P0 |
| T6 | Create and assign a workout plan (structured + notes) — same entitlement as T5 (`WORKOUT_PLANS` grant not required to assign/edit definition) | P0 |
| T7 | Reuse/duplicate a plan as a template for another client | P1 |
| T8 | View client plan adherence / completion % — requires matching `DIET_PLANS` / `WORKOUT_PLANS` class grant | P1 |

Trainer **cannot** log attendance in MVP.

### 4.3 Admin

| # | Feature | Priority |
|---|---|---|
| A1 | Sign up / log in and create a Gym Org (name, address, contact, branding) | P0 |
| A2 | Invite trainers by **`staff_code` / QR** (existing STAFF accounts only; unlimited trainers) | P0 |
| A2b | Invite additional desk Admins by **`staff_code` / QR** (capped, e.g. max 3 total Admins) | P0 |
| A3 | View/manage all clients in the gym | P0 |
| A4 | Assign / reassign a client to a trainer (may assign to self when Admin-as-Trainer) — **requires** active `TRAINER_COACHING` addon | P0 |
| A5 | View attendance logs (per client, per day, gym-wide); **mark attendance at desk** | P0 |
| A6 | Create **membership invite** (name, phone, email, **base** plan, payment status; optional Trainer addon) → client invitation list + email/link | P0 |
| A7 | Define membership plans: Admin-chosen **name**, duration, price; system **`kind`** `BASE` \| `ADDON`; ADDON plans also set **`capability`** (MVP: `TRAINER_COACHING`) | P0 |
| A8 | Assign **base** subscription (required) and optional **addon** lines; record payment status per line (`paid` / `unpaid` / `partial`) | P0 |
| A8b | Attach / renew / end a Trainer addon independently of base (while base is ACTIVE) | P0 |
| A9 | Renewal due dates list (base + addon, labeled) + Admin inbox for due items | P0 |
| A10 | Renewal reminder notification (T-2) for base and addon — push + in-app | P0 |
| A10b | Daily Admin nudge for members with `unpaid` / `partial` on any active line (inbox + push) | P0 |
| A11 | Mini-CRM: capture leads (name, phone, source, interest, notes); soft warn on duplicate open-lead phone | P0 |
| A12 | Mini-CRM: status pipeline (New → Contacted → Trial → Converted → Lost) | P0 |
| A13 | Mini-CRM: follow-up reminders per lead | P0 |
| A14 | Convert a lead into a **membership invite** (pre-filled) | P1 |
| A15 | Offboard client (`INACTIVE`); clears all DataGrants for that gym; attendance + billing retained as GymOwned; Client-owned rows remain on the User | P0 |
| A16 | Basic dashboard (active clients, attendance today, expiring subscriptions, new leads) | P1 |
| A17 | View Client-owned data the member has **granted** this gym (same grant rules as Trainer; no copy from other gyms) | P0 |
| A18 | Manual **block check-in** on a client (safety valve; not auto-tied to payment status) | P0 |
| A19 | Set / override subscription **start date** | P0 |

---

## 5. Key User Flows

### 5.1 Admin onboarding

1. Admin signs up as **STAFF** (email OTP or Google + email verify) → role `STAFF_UNASSIGNED` → creates Gym Org → becomes owner Admin (`role_id` → `ADMIN`, `gym_admins` + optional `trainer_profiles`).
2. Defines at least one **BASE** membership plan (optionally ADDON plans).
3. Optionally staff-invites Trainer(s) / desk Admin(s) via `staff_code` / QR.
4. Ready to create **membership invites** for clients.

### 5.2 Client joins a gym

**Only path:** Admin creates a **`membership_invite`** (name, phone, email, base plan + payment, optional Trainer addon + payment) → appears in the client’s **in-app invitation list** (match `invited_user_id` or verified email) and via email/link.

**No open join codes.** **No shadow profiles** — Admin roster shows pending **invites** until accept; membership row exists only after accept.

### 5.3 Invite → Active (accept rules)

1. Invite carries base (± addon) and payment statuses; status `PENDING` until accept / revoke / expire (default **14 days**).
2. Client accepts in app (identity must match invited email / user). Blocked if they already have an `ACTIVE` membership elsewhere.
3. On accept (transaction): create/link User (CLIENT lane) → **`ACTIVE` `client_membership`** → base (± addon) **subscription** rows with **price/duration snapshotted** from the current catalog → required **profile_attribute_grants** (DOB, HEIGHT, WEIGHT) + any optional profile/class grants from checklist → **no Client-owned data copying**.
4. **Base subscription clock:** Admin may set `start_date` on accept/assign; if null → **first attendance** sets start/end.
5. **Addon clock:** Admin attach day (or override); not attendance-based.
6. Check-in only when membership `ACTIVE`, not blocked, and base is in-date (`start_date` null **or** today in range per **gym timezone**).

### 5.4 Trainer assignment

Allowed only while the client has an **ACTIVE** `TRAINER_COACHING` addon (in-date). Admin assigns a Trainer from the gym’s trainer list (or self). Client and Trainer notified. Reassignment preserves plan history within the same gym. When the addon expires, the trainer link is **kept** but new coaching writes are frozen (see §5.13).

### 5.5 Diet / workout assignment

Requires an **ACTIVE** `TRAINER_COACHING` addon. Trainer or Admin-as-Trainer opens client → creates/assigns **hybrid** plan:

- **Diet:** structured meals/slots + items + calorie/macro targets + free-text notes.
- **Workout:** days → exercises → sets/reps/schedule + free-text notes.

Client sees immediately and can mark items complete **per calendar day** (`PlanCompletion`); adherence feeds Trainer/Admin views only when the matching class grant exists. Assigning Trainer may view/edit the plan definition without that grant. No PDF-upload-as-plan in MVP. Data model supports clone/template (UI may be P1). Without an active Trainer addon: Client has **no coaching surface** (or empty state); if prior plans exist after expiry, they are **read-only history**.

### 5.6 Attendance

- **Client:** in-app Check in → timestamped record for current gym.
- **Admin:** desk mark present (forgot phone, etc.).
- **Trainer:** cannot log attendance in MVP.
- First attendance may start subscription unless Admin already set `start_date`.
- Admin **block check-in** prevents further check-ins for that client until cleared.

### 5.7 Subscription renewal reminder

Daily job → **base and addon** subscription rows with `end_date = today + 2 days` → push + in-app to Client and Gym Admins. Admin expiring-soon inbox lists both, **labeled** (`Base` / addon name or capability). No WhatsApp/SMS reminder channel in MVP.

### 5.7b Daily unpaid payment nudge

Daily job → any **in-date** base or addon line with `payment_status` in (`unpaid`, `partial`) → Admin inbox (+ push). Does **not** auto-lock access; entitlement still follows dates (§5.9 / §5.13).

### 5.8 Leads → follow-up → conversion

Admin logs lead → follow-up reminder → status updates → on convert, creates **membership invite** pre-filled from lead (P1: one-click convert).

### 5.9 Payment status vs access

`unpaid` / `partial` on an **in-date** line does **not** revoke entitlements for that line. Base unpaid → still check-in / calories / health sync. Trainer addon unpaid but in-date → still coaching. Admin sees payment badges; daily unpaid nudge (§5.7b). Check-in lockout remains manual via **block check-in**. Coaching hard-stop is **addon date expiry** (or Admin ending the addon), not payment status.

### 5.10 Calorie logging (Indian food API)

1. Client types a meal phrase (e.g. `2 idlis, 1 omelette`) or picks from search.
2. Backend parses qty + food against **owned FoodItem catalog** (AI-bootstrapped, human-vetted Indian staples; English names; aliases allowed internally).
3. Returns calories/macros per matched items; client confirms and saves `CalorieLogEntry`.
4. If miss: **manual calorie/macro entry** always available.
5. No barcode flow. No third-party nutrition API in MVP.

### 5.11 Health app sync

Client connects Apple Health (iOS) / Health Connect (Android) / Samsung Health as applicable. Connection and daily metrics are **Client-owned** (not gym-scoped). Read-only sync: steps, workouts/sessions, active calories, body weight → wearable daily metrics; weight also upserts **ProgressLog** (canonical weight history) and refreshes profile current weight. Showcase build = production: **live sync required**, not stubbed. Staff see synced metrics only with a `WEARABLES` (and/or `PROGRESS` for weight trend) grant.

### 5.12 Leaving a gym / joining another / erasure (MVP)

**Offboard:** membership → `INACTIVE`; all `DataGrant`s for that `(client, gym)` end immediately. Gym keeps `Attendance`, `Subscription`, and membership rows (`GymOwnedRecord`). Client-owned rows stay on the User.

**Join another gym (or rejoin the same gym):** new membership + **fresh grant checklist** (required DOB/HEIGHT/WEIGHT; other classes optional, default off). Grants never auto-carry. The new gym sees Client-owned history only for classes newly granted — same rows, **no copy**. Prior gym attendance is not shared (gym-owned, stays with the prior org).

**Erasure (DPDP):** privileged procedure — hard-delete Client-owned data and grants; anonymize-retain gym ops/attendance/billing pointers; scrub audit; delete auth user (ADR-0003). Leave ≠ erasure.

### 5.13 Base subscription + addons

| Rule | Detail |
|---|---|
| Catalog | Admin creates plans with custom **name**, duration, price. System tags **`kind`**: `BASE` \| `ADDON`. ADDON plans require **`capability`** (MVP: `TRAINER_COACHING` → trainer assignment + diet + workout). |
| Membership | Created only on **invite accept** as `ACTIVE` with base subscription. Trainer addon optional on invite or later. No PT-only membership. |
| Lines | One **active (in-date) base** row; zero or one **active addon per capability**. Same `subscriptions` table; `kind` + `capability` denormalized on the line. Non-overlap enforced in DB (exclusion over date ranges); at most one not-yet-started BASE (`start_date` null). |
| Price | **Snapshot** `price_amount` + `duration_days` on the line at creation. Catalog edits do not rewrite historical amounts owed. Invite still has no price snapshot. |
| Lifecycle | Base and addon have independent start/end and payment. Addon may start mid-base cycle. Addon ACTIVE only while base membership/subscription is ACTIVE; base end → addon ends. |
| Renew | **New subscription row** per period (base and addon). Prior rows retained for audit/history. |
| Capability gate | No active `TRAINER_COACHING` → cannot assign trainer; cannot assign new diet/workout. |
| Expiry | Addon `end_date` passed → **auto freeze**: prior diet/workout **read-only**; trainer link kept; renew/attach new ACTIVE row unlocks writes. |
| Client UX | Base-only: hide coaching tabs (or empty “available with PT”). Frozen: history visible, no new plans. |
| Extensibility | Later addons = new `capability` enum values + ADDON catalog rows — no remodel of flat “one plan” billing. |

---

## 6. Data Model (high level)

Illustrative entities (see `docs/schema.dbml` for full shape; soft-delete `deleted_at` on mutable tables; glossary in `CONTEXT.md`):

**Gym-owned:** membership, invites, subscriptions, attendance, leads, plan catalog.

**Client-owned** (no owning `gym_org_id` on personal logs; staff read via DataGrant only):

- **ClientProfile** — 1:1 with User. `weight_kg` = maintained current weight from ProgressLog.
- **ProfileAttributeGrant** — per-attribute consent (DOB/HEIGHT/WEIGHT required on accept).
- **DataGrant** — class grants: `PROGRESS`, `CALORIES`, `WEARABLES`, `DIET_PLANS`, `WORKOUT_PLANS`.
- **ProgressLog** / **CalorieLog*** / **WearableConnection** / **WearableDailyMetric** — User-owned.
- **DietPlan** / **WorkoutPlan** — Client-owned instances; `gym_org_id` + trainer = assigning provenance. **PlanCompletion** = per-day completion child (not `completed_at` on templates).

**Also:**

- **Role** / **RolePermission** — frozen seeded lookup; `users.role_id`. Lanes `CLIENT` | `STAFF`.
- **User** — id (= `auth.users.id`), role_id, name, email, phone nullable, `staff_code` (STAFF only), google_id.
- **GymOrg** — name, address, contact, branding, **timezone** (default `Asia/Kolkata`), `owner_user_id`.
- **GymAdmin** / **TrainerProfile** — staff affiliations per gym.
- **StaffInvite** / **MembershipInvite** / **ClientMembership** — as before; at most one `ACTIVE` membership per client.
- **MembershipPlan** / **Subscription** — snapshot price/duration on subscription; DB non-overlap (ADR-0004).
- **Attendance** — gym-owned; retained after leave; no per-day unique in MVP.
- **FoodItem** — platform catalog.
- **Lead** — gym-owned; phone not unique; soft duplicate warning.
- **Notification** / **AuditLog** — audit_logs append-only (no soft delete).

**Removed from MVP:** open `GymJoinCode`, membership status `PENDING`, automatic grant carry across gyms.

**Permission note:** `role_permissions` ∧ affiliation ∧ tenancy; Client-owned reads also require the matching DataGrant. Medical notes only if `MEDICAL_NOTES` grant for that gym.

---

## 7. Third-Party Integrations

### 7.1 Authentication (Supabase Auth)

- **Primary:** email + OTP via a free transactional-email provider configured with Supabase Auth (e.g. built-in Supabase SMTP, Resend, or Brevo free tier — no per-message SMS cost, unlike phone OTP).
- **Secondary:** Google OAuth, which already supplies a verified email; that email becomes/matches the canonical identity.
- **Out:** Facebook.

### 7.2 Health apps (P0, live)

| Provider | Path | Notes |
|---|---|---|
| Apple Health | HealthKit (iOS) | Native entitlement; iOS app only |
| Google | Health Connect on Android | Prefer Health Connect over legacy Fit API |
| Samsung Health | Samsung / Health Connect | As available on Android |

Read-only: steps, workouts, active calories, weight.

### 7.3 Nutrition / food data

**Owned FoodItem API** in Express/Supabase — no Nutritionix/Edamam/USDA-as-primary, no barcode.

- Seed ~200–500 Indian staples via AI bootstrap + human vetting.
- Parser: multi-item strings with quantities.
- Manual entry fallback mandatory.

### 7.4 Notifications

- Push (FCM/APNs) + in-app.
- Admin web inbox for renewals and lead follow-ups.
- WhatsApp / reminder SMS: **out of MVP** (round 2 candidate).

### 7.5 Platform stack

| Layer | Choice |
|---|---|
| Mobile | React Native (Client + Trainer; Admin mobile secondary) |
| Web | Next.js (Admin-primary: dashboards, CRM, renewals, tables) |
| API | Node.js + Express |
| DB + Auth | Supabase |

---

## 8. Notifications Matrix

| Trigger | Recipient(s) | Channel(s) | Timing |
|---|---|---|---|
| Subscription expiring (base or addon) | Client + Gym Admins | Push + in-app + Admin inbox | T-2 before that line’s `end_date` |
| Payment pending (unpaid / partial, in-date lines) | Gym Admins | Push + in-app + Admin inbox | Daily digest |
| Trainer assigned/reassigned | Client, Trainer | Push + in-app | Immediate |
| New diet/workout plan assigned | Client | Push + in-app | Immediate |
| Membership invite created / accepted | Client, Admin | Push + in-app | Immediate |
| Staff invite created / accepted | Staff user, Admin | Push + in-app | Immediate |
| Lead follow-up due | Admins | Push + in-app + web inbox | On follow-up date |
| Check-in blocked/unblocked | Client | In-app | Immediate |

---

## 9. Non-Functional Requirements

- **Data privacy:** Diet, workout, weight/BMI, calorie, and health-sync data are sensitive Client-owned records. Encryption in transit/at rest; staff access via DataGrant (no copy); gym tenancy for Gym-owned records; design for **India DPDP** from day one including an erasure procedure (ADR-0003).
- **Availability:** Prioritize check-in and plan viewing reliability over heavy Admin reporting.
- **Platform parity:** Client/Trainer core on mobile; Admin core on web (mobile secondary).
- **Auditability:** Payment-status changes, plan assignments, Admin-recorded attendance, and check-in blocks are timestamped and attributable.
- **Language:** English-only UI for MVP.
- **Production bar:** Showcase build is the production app — live health sync and real OTP; not stubbed demos for core paths.

---

## 10. Out of Scope / Future Backlog

- Live cross-gym membership roaming (one ACTIVE membership still).
- Automatic grant inheritance / silent consent handoff between gyms.
- Shadow profiles without app claim.
- Payment gateway (Razorpay etc.).
- WhatsApp Business / SMS reminders.
- Maps gym directory; Facebook login; barcode nutrition; third-party NL nutrition APIs.
- QR/geofence attendance; AI-generated coaching plans.
- Full Hindi UI; multi-branch switcher UI; franchise hierarchy; class booking; POS.
- Configurable RBAC.

---

## 11. Success Metrics (MVP)

- % of gyms where Admin has added ≥1 trainer **or** used Admin-as-Trainer and ≥1 client who **accepted a membership invite** within 7 days of signup (activation).
- Weekly active client check-in rate (attendance logs / active clients).
- % of assigned diet/workout plans interacted with weekly (adherence).
- % of expiring subscriptions renewed after T-2 reminder (retention signal).
- Lead → converted-client rate via mini-CRM.
- Food log success rate: % of meal entries resolved from FoodItem DB vs manual fallback (catalog quality).

---

## 12. Open Questions

1. **Transactional-email provider** for OTP delivery (Supabase built-in SMTP vs Resend vs Brevo free tier) and deliverability/spam-folder risk at expected volume.
2. **Admin cap** exact number (recommend 3) and whether owner can demote/remove other Admins.
3. **Food catalog ownership** — who vets AI-seeded items ongoing (internal only vs Admin-suggest)?
4. **Samsung Health** vs Health Connect-only on Android if overlap is redundant for MVP devices.
5. **Expo vs bare React Native** for HealthKit / Health Connect module needs.
6. **Session-pack PT** (count-based) — deferred; validate with owners at showcase.
7. **Daily unpaid digest** exact UX (rollup vs per-member rows).
8. **Per-day attendance uniqueness** — deferred to round 2 as gym-configurable policy.
9. **Erasure UX timing** — self-serve in Client app vs Admin/support-triggered for MVP (procedure itself is locked in ADR-0003).

---

## 13. Decision Log (grill summary)

| Topic | Decision |
|---|---|
| Buyer / wedge | Admin; renewals + CRM + desk ops |
| Beachhead | Solo owner-operator; Admin-as-Trainer |
| Client fitness scope | Calorie + live health sync; **Client-owned** + DataGrants in MVP |
| Delivery | Big-bang production; showcase = prod; feedback → round 2 |
| Geography | India-first; DPDP-aware (incl. erasure procedure); English UI |
| Shadows | None — must claim app |
| Pre-claim desk sale | `membership_invite` with plan + payment (not a membership row) |
| Join | Admin membership invite only; in-app list; **no open join codes** |
| Sub start | First attendance **or** Admin-set date |
| Attendance loggers | Client + Admin; no per-day unique (MVP); gym-owned / retained on leave |
| Unpaid access | Entitlement by dates; badge + daily Admin nudge; block check-in manual |
| Auth | Email OTP primary; Google + email; `public.users.id` = `auth.users.id` |
| Roles | Frozen `roles` + `role_permissions`; lane CLIENT\|STAFF; no mixing |
| Staff onboarding | Existing STAFF account + `staff_code`/QR → `staff_invites` |
| Data share | Grants only (no copy); required DOB/HEIGHT/WEIGHT; class grants optional |
| Personal data ownership | User owns profile/progress/calories/wearables/plan instances |
| Food | Own Indian Food API; NL-style entry; no barcode |
| Admins per gym | Owner + staff-invited Admins (capped) |
| Multi-location | DB yes; UI single-gym |
| Plans (coaching) | Hybrid; ACTIVE\|ARCHIVED; per-day PlanCompletion |
| Billing | Base + addons; snapshot price; DB non-overlap |
| Soft delete | `deleted_at` on mutable entities |
| Time | UTC storage; gym timezone for calendar-day gym rules |
| Reminders | T-2 base + addon; WhatsApp later |
| Stack | RN · Next.js · Express · Supabase |
| ADRs | 0002 ownership/grants · 0003 erasure · 0004 subscription · 0005 deleted_at |

---

*End of PRD v2.3*
