# Gym SaaS — Product Flows & UI Requirements Brief

**Source of truth:** PRD v2.3 · `CONTEXT.md` · ADRs 0002–0007   
**Audience:** Product/design/implementation of Client mobile, Trainer mobile, and Admin web  
**Geography / language:** India-first · English UI only  
**Stack surfaces:** React Native (Client + Trainer; light Admin) · Next.js (Admin-primary)

This document describes **what people do**, **what they see**, **what is blocked**, and **how screens connect**. It is organized by domain module (M1–M13). Cross-cutting rules that affect every screen appear first.

**API delivery (backend):** Auth + gym-orgs + Mini-CRM A11–A13 + membership plan catalog + Admin membership invites + Client inbox/accept + DataGrants + subscription payment/start override + Client subscription list + roster / assign / offboard / block + attendance + profile/progress + renewals due-list are **live**. Next: Stint 3. See [`PROGRESS.md`](PROGRESS.md), [`client-auth.md`](client-auth.md), [`membership-invites.md`](membership-invites.md), [`subscriptions.md`](subscriptions.md), [`roster.md`](roster.md), [`api.md`](api.md), Orbit at [gym-prd-visual.vercel.app/#orbit](https://gym-prd-visual.vercel.app/#orbit).

---

## Cross-cutting product rules

### Personas

| Persona | Account lane | How they enter | Primary surface |
|---|---|---|---|
| **Client** | `CLIENT` | Accepts Admin membership invite | Mobile |
| **Trainer** | `STAFF` → role `TRAINER` after staff invite | Accepts staff invite via `staff_code` / QR | Mobile |
| **Admin** | `STAFF` → role `ADMIN` after creating org or accepting Admin staff invite | Creates Gym Org (owner) or accepts desk-Admin invite | Web primary; mobile secondary |
| **Admin-as-Trainer** | Same Admin account + `trainer_profiles` row | Owner/desk Admin who also trains | Web + Trainer mobile flows |

- One person cannot be Client and Staff on the same account. Two hats → two accounts.
- A Client has **at most one ACTIVE membership** at a time (cannot check into multiple gyms under one sub).
- MVP UI is **single-gym** for staff (no branch switcher), even if an owner can own multiple orgs in data.

### Two ownership classes (drives every privacy UI)

| Class | Owned by | Examples | Staff access |
|---|---|---|---|
| **Gym-owned** | The gym | Membership, invites, subscriptions, attendance, leads, plan catalog | Affiliation + role — **no** client consent grant |
| **Client-owned** | The member (User) | Profile, progress, calories, wearables/metrics, assigned diet/workout plans + daily completions | Affiliation + role + **explicit DataGrant** (except authoring rules below) |

Staff never get a **copy** of Client-owned data. They read the Client’s rows when a grant exists.

### DataGrants (consent UI)

**Profile attributes (field-level):** DOB, HEIGHT, WEIGHT, GENDER, MEDICAL_NOTES  

**Class grants:** `PROGRESS` · `CALORIES` · `WEARABLES` · `DIET_PLANS` · `WORKOUT_PLANS`

| Moment | Behavior |
|---|---|
| Accept membership invite | **Required:** DOB, HEIGHT, WEIGHT. All other attributes and all class grants **optional, default off**. |
| While ACTIVE | Client can open Privacy / Sharing and grant or revoke any optional item. |
| Leave / offboard (`INACTIVE`) | **All grants for that gym clear immediately.** |
| Join another gym (or rejoin same) | **Fresh checklist.** Grants never auto-carry. |
| Plan assign | Trainer may assign/edit plan **definition** without class grant. Seeing **completions / adherence %** needs `DIET_PLANS` / `WORKOUT_PLANS`. |
| Other staff | Need class grant to see plan definition or adherence. |

**Staff empty states when grant missing:** show a clear “Member has not shared X” state — not a blank crash, not fake data.

### Billing vs access (global)

- Entitlement follows **dates** (in-date base / addon), not payment status.
- `unpaid` / `partial` → badges + Admin daily nudge; **does not** auto-lock check-in or coaching.
- Check-in lock is **manual** Admin “block check-in.”
- Coaching hard-stop is **addon expiry** (or Admin ends addon), not unpaid status.

### Time

- Instants stored UTC; **calendar days** for gym ops use the gym’s timezone (default `Asia/Kolkata`).
- Plan / extra food “days” use the **assigning gym’s** timezone (extras with no coaching gym: `Asia/Kolkata`).
- UI copy for dates should be local to gym timezone for Admin desk and renewal lists.

### Explicitly out of MVP (do not design)

Open join codes · shadow profiles · payment gateway · WhatsApp/SMS reminders · maps gym directory · barcode food scan · third-party nutrition APIs · QR/geofence check-in · Facebook login · Hindi UI · multi-branch switcher · custom RBAC · class booking · POS · AI-generated coaching plans · automatic grant inheritance across gyms

---

## End-to-end journeys (wire these first)

### Journey A — Solo owner stands up a gym

1. Sign up as Staff (email OTP or Google + verified email).
2. Create Gym Org (name, address, contact, logo, timezone).
3. Optionally enable Admin-as-Trainer.
4. Create at least one **BASE** plan; optionally a **TRAINER_COACHING** addon plan.
5. Optionally invite Trainer(s) / desk Admin(s) via staff code/QR.
6. Create membership invites for walk-ins / phone leads.
7. Day-to-day: renewals inbox, unpaid nudge, desk check-in, CRM, coaching (if self-trainer).

### Journey B — Client joins and uses the app

1. Sign up / log in as Client (email OTP or Google + email).
2. See invite in Invitation list (and/or open email link).
3. Accept → required vitals grants + optional sharing checklist → ACTIVE membership.
4. Check in; view base (± addon) subscription; edit profile; log calories; connect health apps.
5. If PT addon active: see diet/workout; complete diet items into today’s diary (and log extras); manage who at the gym can see progress/plans/etc.

### Journey C — Trainer coaches

1. Sign up as Staff → receive `staff_code` / QR → accept Trainer invite.
2. See assigned roster.
3. Open client → view attendance always; view profile/progress only if granted.
4. Assign diet/workout (needs in-date Trainer addon on client) → edit structure anytime while coaching unlocked.
5. Adherence % visible only with matching class grant.

### Journey D — Leave / rejoin / erase

1. Admin offboards → membership INACTIVE; grants cleared; gym keeps attendance & billing history.
2. Client later accepts new invite (same or other gym) → new membership + new grant checklist.
3. Erasure (P1): Client-owned data purged; gym ops anonymized-retained — separate from offboard.

---

## M1 — Identity & Access

### Purpose

Authenticate users, choose account lane, establish frozen system roles. No gym powers until affiliation exists.

**API status:** Shipped — see [`client-auth.md`](client-auth.md).

### Screens / entry points

| Screen | Personas | Surface |
|---|---|---|
| Welcome / lane chooser | New user | Mobile + Web |
| Email OTP request + enter code | All | Mobile + Web |
| Google sign-in | All | Mobile + Web |
| Email link / verify (post-Google if needed) | All | Follow-up |
| Staff home (unassigned) showing **staff code + QR** | Staff before invite | Mobile (+ Web) |
| Account / security settings | All | Mobile + Web |

### Flows

**F1.1 Client signup / login**

1. Enter email → `POST /auth/otp/request` returns `isNewUser`.
2. If `isNewUser`, collect **lane** (`CLIENT`) and optional display name; otherwise skip lane.
3. Enter OTP → verify (`lane` only on first provision) → session.
4. Or Google → must end with verified email as canonical identity; lane on first complete.
5. Land on Client shell: Invitation list if no ACTIVE membership; home if ACTIVE.

**F1.2 Staff signup / login**

1. Enter email → if `isNewUser`, choose **STAFF** lane → role `STAFF_UNASSIGNED` on first verify.
2. Auth same as Client (email OTP primary); returning staff omit lane.
3. Show **staff_code** prominently and render it as a QR client-side (needed for owner invite).
4. Empty state: “Waiting for a gym invite” + how to share code with owner.

**F1.3 Lane rules in UI**

- Client cannot accept staff invites; Staff cannot accept membership invites.
- No UI to “upgrade” Client ↔ Staff on one account — copy should say create a second account.

### States & copy cues

- OTP sent / invalid / expired / rate-limited.
- Google without usable email → return `EMAIL_NOT_VERIFIED`; email link/verify is a post-MVP follow-up.
- Facebook and phone-OTP login: **not offered**.

### Requirements coverage

C1, T1, A1 (auth portion) · frozen roles · Admin-as-Trainer is affiliation later, not a third lane.

---

## M2 — Gym Organization

### Purpose

Create and configure the gym tenant; issue client and staff invites; own branding and timezone.

**API status:** Gym org CRUD + staff invite lifecycle **shipped**. Client membership invite issuance lives under M3 APIs ([`membership-invites.md`](membership-invites.md)).

### Screens (Admin web primary)

| Screen | Notes |
|---|---|
| Create Gym Org wizard | Name, address, contact phone/email, logo upload, timezone (default Asia/Kolkata) |
| Gym settings | Edit profile/branding/timezone |
| Staff invites | Invite Trainer or desk Admin by scanning/entering staff_code |
| Pending staff invites list | PENDING / ACCEPTED / REVOKED / EXPIRED |
| Client membership invites | Create + list pending invites (also under M3) |
| Owner indicator | Owner vs desk Admin |

### Flows

**F2.1 Create gym (first-run Admin)**

1. After STAFF signup, CTA: **Create your gym**.
2. Submit → user becomes ADMIN, `gym_admins.is_owner`, optional prompt: “Also train members?” → create `trainer_profiles`.
3. Next step CTA: **Add a membership plan** (M4).

**F2.2 Invite Trainer**

1. Admin enters/scans staff_code of existing STAFF user.
2. Target role TRAINER → pending staff invite (default expire 14 days).
3. Staff sees invite in-app (inbox shows gym name, address, and contact details) → Accept → role TRAINER + trainer_profiles.
4. Notify both sides (M12).

**F2.3 Invite desk Admin**

1. Same as Trainer but target ADMIN; enforce **cap** (recommend max 3 Admins including owner).
2. At cap: disable CTA with explanation.

**F2.4 Client invite issuance** — see M3 / F3.1 (Admin creates membership invite from this gym).

### Client / Trainer surfaces

- Client: only **invitation list** for membership invites to this gym (no gym directory).
- Trainer: staff invitation accept only; no gym create.

### Out of module UI

- Open join codes, public gym discovery, multi-branch switcher.

### Requirements

A1, A2, A2b · timezone for all calendar-day displays · single-gym UI.

---

## M3 — Members & Memberships

### Purpose

Invite → accept → ACTIVE membership; roster; trainer assignment; DataGrants; offboard; block check-in.

**API status:** Admin invite create/list/revoke, Client inbox/accept, Client `my-data-grants`, and Phase 5 roster / assign / offboard / block are **shipped**. Integration: [`membership-invites.md`](membership-invites.md) · [`roster.md`](roster.md).

### Screens

**Admin web**

| Screen | Contents |
|---|---|
| Members roster | ACTIVE / INACTIVE filter; search; payment badges; check-in blocked badge; assigned trainer |
| Pending invites | PENDING invites (not yet members) |
| Create membership invite | Name, phone, email, BASE plan, base payment status; optional TRAINER_COACHING addon + payment; optional start date |
| Member detail | Membership status, subscriptions summary, trainer, grants summary (what they’ve shared), attendance shortcut, actions |
| Assign / reassign trainer | Only if in-date Trainer addon |
| Offboard confirm | Explains grants clear; attendance/billing kept |
| Block / unblock check-in | Safety valve |

**Client mobile**

| Screen | Contents |
|---|---|
| Invitations | Pending membership invites matching user/email |
| Accept invite | Plan summary + **Sharing checklist** |
| Privacy / Sharing | Per-gym grants while ACTIVE |
| My membership | Status, gym name, trainer, block status |

**Trainer mobile**

| Screen | Contents |
|---|---|
| Assigned roster | Clients assigned to this trainer |
| Client summary | Attendance always; granted fields only |

### Flows

**F3.1 Create membership invite (Admin)**

1. Form: invitee name, phone (optional contact), email (required), BASE plan (required), payment status for base; optional addon plan + payment.
2. No price snapshot on invite — show **current catalog price** as informational (“at accept, price is taken from plan”).
3. Submit → PENDING invite; Client notified; appears in Client invitation list; email/link.
4. Roster does **not** show a membership row yet — show under Pending invites.

**F3.2 Accept invite (Client)**

1. Open invite → see gym, plans, payment statuses, expiry.
2. Blockers: already ACTIVE elsewhere; invite revoked/expired; email mismatch.
3. Sharing step:
   - Locked on: DOB, HEIGHT, WEIGHT (required).
   - Toggles off by default: GENDER, MEDICAL_NOTES, PROGRESS, CALORIES, WEARABLES, DIET_PLANS, WORKOUT_PLANS.
4. Confirm → ACTIVE membership + subscription lines created with snapshotted price/duration.
5. If base start_date null: UI can say “Your membership period starts on your first check-in” (unless Admin set date).

**F3.3 Manage grants (Client)**

1. Settings → Privacy for current gym.
2. Toggle optional grants; revoking immediately hides data from staff.
3. Required vitals: if product allows revoke while ACTIVE, warn that gym needs them for BMI/desk — prefer keep required locked while ACTIVE (PRD: required on accept; optional editable later — treat required as sticky unless product adds “leave gym” first).

**F3.4 Trainer assign (Admin)**

1. Only enabled when client has in-date TRAINER_COACHING addon.
2. Pick trainer (or self if Admin-as-Trainer).
3. Notify Client + Trainer.
4. Reassign keeps prior plan history for that gym provenance.

**F3.5 Offboard (Admin)**

1. Confirm: member becomes INACTIVE; **sharing ends**; gym keeps check-ins and billing history; member keeps their personal logs in their app.
2. Member disappears from ACTIVE roster; appears under inactive.

**F3.6 Block check-in**

1. Toggle on member → Client check-in CTA disabled with reason; notify Client.
2. Unblock restores check-in if membership/base still allow it.

### Grant-aware staff UI (Admin A17 / Trainer T4)

On member profile:

- Show only granted profile fields; hide or lock medical notes without MEDICAL_NOTES.
- BMI only if height + weight (profile current) are grantable/visible.
- Progress / calories / wearables / adherence sections: full content or “Not shared” empty state.
- Attendance: always (gym-owned).

### Requirements

C2, C2b, C2c, C3, A3, A4, A6, A15, A17, A18 · no shadow profiles · no open join codes.

---

## M4 — Plans & Billing Status

### Purpose

Catalog of BASE/ADDON plans; subscription lines with snapshotted price; renewals; payment status tracking (no gateway).

**API status:** Plan catalog CRUD **shipped**. Accept creates snapshotted lines. Admin payment/start override + Client list **shipped** (roadmap 1.5 core; A8b attach/renew deferred). Admin renewals due-list **shipped** (2.4). T-2 push / unpaid digest later.

### Screens (Admin web)

| Screen | Contents |
|---|---|
| Plan catalog | List BASE and ADDON plans; active/inactive for new sales |
| Create / edit plan | Name, duration (days), price, kind BASE\|ADDON; if ADDON → capability TRAINER_COACHING |
| Member billing | Lines: kind, capability, snapshot price, duration, start/end, payment status, amount paid |
| Attach / renew / end addon | Independent of base while base ACTIVE |
| Set / override start date | Base clock |
| Renewals / expiring list | Labeled Base vs addon; T-2 items |
| Unpaid / partial inbox | Daily digest targets |

**Client mobile**

| Screen | Contents |
|---|---|
| My plan / billing | Base + addons: status, dates, payment badge (informational) |
| Renewal banner | When T-2 notification applies |

### Flows

**F4.1 Create BASE plan** — required before selling invites.  
**F4.2 Create ADDON plan** — capability TRAINER_COACHING; used for PT + diet + workout entitlement.  
**F4.3 Subscription on accept** — created from invite; **price_amount + duration_days frozen** on the line. Later catalog price edits do not change this line.  
**F4.4 Renew** — Admin creates a **new** subscription row (cannot overlap prior live dated line). UI should prevent overlapping periods; show clear date pickers.  
**F4.5 Addon attach mid-cycle** — start = attach day (or override); ends if base ends.  
**F4.6 Payment status** — paid / unpaid / partial + amount paid ≤ snapshot price. Badges on roster and member billing. Does not lock features.  
**F4.7 Expiry freeze (addon)** — when addon end_date passes: coaching UI frozen (read-only history); trainer link remains; renew unlocks writes.

### Client visibility rules

- Base-only: hide coaching tabs or show empty “Available with personal training.”
- Frozen addon: history visible, no new plans / no new completions that require active coaching writes (read-only).

### Requirements

A7, A8, A8b, A9, A10, A10b, A19, C10, C11 · non-overlap · snapshot · unpaid nudge.

---

## M5 — Attendance

### Purpose

Record presence; optionally start base subscription on first check-in; gym-owned history retained after leave.

**API status:** Self check-in, Admin desk mark, gym-day / per-client / my history **shipped** (2.1). Enforces `check_in_blocked`. Integration: [`api.md`](api.md) · [`client-auth.md`](client-auth.md).

### Screens

| Screen | Persona | Contents |
|---|---|---|
| Check in | Client | Primary CTA when ACTIVE, not blocked, base in-date (or start_date null) |
| Desk mark present | Admin | Search member → mark present now |
| Attendance today (gym-wide) | Admin | List for local gym day |
| Per-client attendance | Admin, Trainer (view) | History list |
| My attendance | Client | Own history at current gym |

### Flows

**F5.1 Client self check-in**

1. Tap Check in → success toast + timestamp.
2. If base `start_date` was null → period starts (end computed from snapshotted duration); confirm messaging.
3. Failures: blocked, inactive, no ACTIVE membership, base out of date (when start already set and today outside range).

**F5.2 Admin desk mark** — same record with `recorded_by = ADMIN`; use when member forgot phone.  
**F5.3 Trainer** — view only; **no** log CTA.

### Rules for UI

- Multiple check-ins same day **allowed** in MVP (no per-day unique).
- Attendance stays with the gym after offboard; Client viewing “my attendance” is for current/past gym context as product allows — prior gym attendance is **not** shown to a new gym’s staff.

### Requirements

C4, A5 · Trainer cannot log · block check-in interaction with M3.

---

## M6 — Coaching — Diet

### Purpose

Structured diet plans assigned from the **same food catalog** as the calorie diary; completing an item logs it; grant-gated adherence for staff.

**API status:** Search / assign / client complete into diary **shipped** (3.1). Gym diet templates (T7, ADR-0008) **shipped**. CustomFood later. Integration: [`nutrition.md`](nutrition.md).

### Entitlement gate

Client must have **in-date TRAINER_COACHING** addon for new assigns and active editing. After expiry: Client + staff see **read-only** prior plans. Extra diary logging (M9) still works on base membership.

### Screens

**Trainer / Admin-as-Trainer (mobile; Admin web optional)**

| Screen | Contents |
|---|---|
| Client → Diet | ACTIVE plan + archive list |
| Plan builder | Title, notes, MealSlots, catalog search → FoodItem × serving × qty, targets, sort order |
| Assign / replace | Assigning archives previous ACTIVE |
| Adherence | Prescribed vs eaten — **only if DIET_PLANS grant**; else “Not shared” |

**Client**

| Screen | Contents |
|---|---|
| My diet | Today’s slots/items; mark complete for **today** (writes diary); add extra food (M9) on the same slots |
| History / other days | Diary for that date (prescribed + extras) |
| Frozen empty | If no addon: empty or upsell for **assign**; extras still loggable |

### Flows

**F6.1 Assign diet**

1. Confirm client has in-date Trainer addon + assigned trainer (or Admin-as-Trainer).
2. Search catalog (seed + this gym’s CustomFood) → servings → save ACTIVE (prior ACTIVE → ARCHIVED).
3. Notify Client. **No** auto-grant of DIET_PLANS.
4. Assigning trainer can reopen and edit definition without DIET_PLANS grant.

**F6.2 Client mark complete**

1. Toggle item complete for a calendar day → inserts (or soft-deletes) a **plan-linked** `CalorieLogItem` for that day. Same catalog food as the prescription.
2. Completing Monday does **not** mark Tuesday.
3. Adherence counts distinct days with prescribed items logged.

**F6.3 Staff view adherence**

- With DIET_PLANS: show prescribed vs eaten.
- With CALORIES: show extras and day totals.
- Without: hide numbers; optional CTA “Ask member to share diet progress.”

**F6.4 Clone / template (P1)** — trainer-owned gym library (`DietPlanTemplate`). Trainer lists/edits theirs; Admin-as-Trainer sees all at the gym and duplicates into their library. Assign copies a snapshot (`templateId` XOR meals body). Client-to-client clone without a template is out.

### Out of module

- PDF upload as plan · AI auto-generate plan · free-text food names.

### Requirements

C5, T5, T7, T8 (grant), A4 coupling · ADR-0006 (unified diary) · ADR-0008 (gym templates).

---

## M7 — Coaching — Workout

### Purpose

Same pattern as diet for **structure**: search catalog `ExerciseItem` (not typed names); days → prescribed sets/reps/notes; per-day `PlanCompletion`; `WORKOUT_PLANS` grant for adherence. Not a Hevy session log (ADR-0007).

**API status:** Catalog seed **live** (30 movements, ADR-0007). Assign / complete APIs **not shipped** (3.2).

### Screens & flows

Mirror M6 with workout vocabulary:

- Plan builder: search exercise catalog, days, sets, reps, notes.
- Client: mark exercise/session complete **per day**.
- Staff adherence needs `WORKOUT_PLANS`.
- Assign/edit definition by assigning trainer without grant; freeze on addon expiry.

### Out of module

- PDF upload as plan · AI auto-generate · free-text exercise names · Hevy-style set logs.

### Requirements

C6, T6, T7 (P1), T8 (grant) · ADR-0007 (exercise catalog).

---

## M8 — Progress & Body Metrics

### Purpose

Client-owned weight history and BMI; staff see progress only with `PROGRESS` grant. Attendance history widget is gym-owned (view rules differ).

**API status:** Client `/me/profile` + progress logs **shipped** (2.2); staff grant-gated reads **shipped** (2.3). Integration: [`api.md`](api.md) · [`client-auth.md`](client-auth.md).

### Canonical weight rule (UI must obey)

1. **ProgressLog** is the history of record (manual entry + health sync).
2. **Profile current weight** is maintained from the latest progress weight.
3. Editing profile weight **also writes/updates today’s ProgressLog**.
4. BMI = f(profile height, profile current weight).

### Screens

**Client**

| Screen | Contents |
|---|---|
| Progress | Weight chart/list by date; add/edit weigh-in |
| Profile | Height, weight, DOB, gender, medical notes |
| BMI display | On profile/progress |
| Attendance history | Own check-ins |
| Plan adherence (own) | Always visible to Client for their completions |

**Trainer / Admin**

| Screen | Contents |
|---|---|
| Client progress | Only with PROGRESS grant |
| Client BMI / vitals | Only granted attributes |
| Attendance | Always (gym-owned) |
| Adherence | Needs DIET_PLANS / WORKOUT_PLANS |

### Flows

**F8.1 Log weight** — Client enters weight for a date → ProgressLog upsert → refresh profile current + BMI.  
**F8.2 Edit profile** — height/DOB/gender/medical; weight path goes through progress rule.  
**F8.3 Staff open progress without grant** — “Not shared” empty state.

### Requirements

C7, C8, C14, T4, A17 · Client-owned · no gym_org ownership on logs.

---

## M9 — Nutrition (Calorie diary)

### Purpose

Client-owned eaten-today diary against an owned Indian catalog + servings; staff need `CALORIES` for extras/totals. Completing a diet plan item (M6) writes this same diary.

**API status:** Seed search + extras diary + staff CALORIES read **shipped** (3.1). CustomFood APIs later. Integration: [`nutrition.md`](nutrition.md).

### Screens (Client mobile — primary)

| Screen | Contents |
|---|---|
| Today’s log | Totals (cal/macros) per MealSlot + items (prescribed vs extra) |
| Add extra | Search catalog / recent foods → serving × qty → save |
| Complete assigned | From My diet (M6) — not a second food picker |
| CustomFood | Name + serving grams + nutrients when search misses |
| Day picker | Other log dates |

**Staff:** day view with CALORIES (diary) and/or DIET_PLANS (plan vs eaten); otherwise “Not shared.”

### Flows

**F9.1 Search and log extra**

1. Search seed (+ own CustomFood) → pick serving × qty → confirm.
2. Save `CalorieLogItem` with `diet_plan_meal_item_id` null.
3. Day totals update.

**F9.2 Recent foods** — pick from this Client’s prior diary items.  
**F9.3 CustomFood** — structured create, then log that food. No free-text calorie row.

### Targets

- Diet plan slot targets (`TRAINER_COACHING`): show eaten vs target on those slots.
- Base-only clients: diary without prescribed items.

### Out of module

- Barcode · third-party nutrition APIs · photo Snap · NL parser as a store.

### Requirements

C9 · C5 coupling · no third-party nutrition API · no barcode · Client-owned · ADR-0006.

---

## M10 — Health Sync

### Purpose

Connect Apple Health / Health Connect / Samsung Health; sync steps, workouts, active calories, weight into Client-owned stores; live (not stubbed).

### Screens (Client)

| Screen | Contents |
|---|---|
| Connected apps | Provider list + connect/disconnect |
| Sync status | Last synced; errors |
| Today’s metrics | Steps, active kcal, workout minutes, weight |
| Permissions education | OS permission rationale |

### Flows

**F10.1 Connect** — OS permission sheet → create WearableConnection → initial sync.  
**F10.2 Sync** — write WearableDailyMetrics; if weight present → upsert ProgressLog + profile current weight.  
**F10.3 Disconnect** — soft-end connection; historical metrics remain on User until erasure.  
**F10.4 Staff** — metrics visible only with WEARABLES (weight trend also via PROGRESS if that’s the surface).

### Platform notes for UI

- iOS: Apple Health / HealthKit.
- Android: Health Connect preferred; Samsung as available.
- No server “login to Apple” web flow — device-centric.

### Requirements

C12 · Client-owned · grant-gated staff · production-quality live sync.

---

## M11 — Mini-CRM (Leads)

### Purpose

Admin desk pipeline for prospects before they are members.

**API status:** A11–A13 (CRUD, pipeline, soft dup-phone warn, follow-up due list) **shipped**. A14 convert → membership invite and reminder *delivery* remain later.

### Build scope (execution)

| In pull-forward (now) | Deferred |
|---|---|
| A11 capture + soft duplicate-phone warn | A14 convert → membership invite (Stint 3.4 — invites exist) |
| A12 status pipeline | A13 *delivery* of follow-up reminders (push/inbox — Stint 3.5) |
| A13 store `follow_up_date` + Admin due-list query | |

See [`MVP_ROADMAP.md`](MVP_ROADMAP.md) Pull-forward and [`PROGRESS.md`](PROGRESS.md) Next up.

### Screens (Admin web)

| Screen | Contents |
|---|---|
| Leads board / list | Columns or filters: New → Contacted → Trial → Converted → Lost |
| Lead detail | Name, phone, source, interest, notes, follow-up date, status |
| Create / edit lead | Form + **soft duplicate warning** if same phone exists on another open lead |
| Follow-ups due | Inbox slice (also M12) |
| Convert (P1) | One click → membership invite pre-filled |

### Flows

**F11.1 Capture walk-in lead** → status NEW.  
**F11.2 Move pipeline** → Contacted / Trial / Lost / Converted.  
**F11.3 Follow-up date** → reminder to Admins on that date.  
**F11.4 Convert (P1)** → opens create membership invite with name/phone/email prefilled; does not create membership until Client accepts.  
**F11.5 Duplicate phone** — warn, do not hard-block; re-inquiry after LOST = new lead row is OK.

### Requirements

A11–A14 · phone not unique identity · gym-owned.

---

## M12 — Notifications & Inbox

### Purpose

Push + in-app notifications; Admin web inbox for operational queues. No WhatsApp/SMS in MVP.

### Surfaces

| Surface | Role |
|---|---|
| Mobile notification center | Client, Trainer, Admin (light) |
| OS push | All |
| Admin web inbox | Renewals (T-2), unpaid digest, lead follow-ups |

### Notification matrix (must have UI affordances)

| Trigger | Who | Where | When |
|---|---|---|---|
| Subscription expiring (base or addon) | Client + Gym Admins | Push + in-app + Admin inbox | T-2 before that line’s end_date |
| Payment unpaid/partial (in-date) | Gym Admins | Push + in-app + Admin inbox | Daily digest |
| Trainer assigned/reassigned | Client, Trainer | Push + in-app | Immediate |
| Diet/workout plan assigned | Client | Push + in-app | Immediate |
| Membership invite created / accepted | Client, Admin | Push + in-app | Immediate |
| Staff invite created / accepted | Staff, Admin | Push + in-app | Immediate |
| Lead follow-up due | Admins | Push + in-app + web inbox | On follow-up date |
| Check-in blocked/unblocked | Client | In-app | Immediate |

### UI requirements

- Inbox items deep-link to member billing, lead detail, invite, etc.
- Label renewal rows **Base** vs addon name/capability.
- Unpaid digest: rollup vs per-member still open — support either; prefer scannable per-member rows for desk use.
- Read/unread state for in-app notifications.

### Requirements

C11, A9, A10, A10b, A13 · channels push + in-app only.

---

## M13 — Platform / Shared (UI implications only)

Not a user-facing “module,” but UI must respect:

| Concern | UI implication |
|---|---|
| Tenancy | Admin/Trainer never see other gyms’ data; no cross-gym browsing |
| Audit | No special Client UI; Admin may later need audit views (not MVP-critical screens) |
| Jobs | Users experience T-2 and unpaid digests as notifications/inbox, not job consoles |
| Branding storage | Gym logo on Admin settings and optionally Client header for current gym |
| Soft delete | Deleted/revoked items disappear from default lists; no “trash” UI required in MVP |
| Erasure (P1) | Account settings entry: request delete account — irreversible warning; distinct from “leave gym” |

---

## Screen map by persona (quick index)

### Client mobile (core tabs / stacks)

1. Home / today (check-in CTA, renewal banners, today’s plan summary)  
2. Invitations  
3. Attendance  
4. Diet (gated)  
5. Workout (gated)  
6. Progress  
7. Nutrition  
8. Health sync  
9. Billing / membership  
10. Profile + Privacy/Sharing  
11. Notifications  
12. Account (logout, erasure P1)

### Trainer mobile

1. Roster  
2. Client detail (grant-aware sections)  
3. Diet builder / adherence  
4. Workout builder / adherence  
5. Notifications  
6. Account / staff code (if still relevant)

### Admin web

1. Dashboard (P1): active clients, attendance today, expiring subs, new leads  
2. Members + pending invites  
3. Member detail (billing, trainer, grants summary, block, offboard)  
4. Plan catalog  
5. Renewals inbox  
6. Unpaid inbox  
7. Attendance (desk + logs)  
8. Leads CRM  
9. Staff invites / team  
10. Gym settings  
11. Coaching (if Admin-as-Trainer) — can reuse Trainer patterns  
12. Notifications / inbox shell  

---

## Empty states & error patterns (use consistently)

| Situation | Pattern |
|---|---|
| No ACTIVE membership (Client) | Invitations-first home; grayed feature tabs with “Join a gym via invite” |
| Base-only (no PT addon) | Coaching tabs hidden or empty “Available with personal training” |
| Addon expired | Read-only plans; banner “Renew PT to get new plans” |
| Missing DataGrant (staff) | Section card: “Not shared by member” — never invent values |
| Check-in blocked | Disabled CTA + reason |
| Invite expired/revoked | Status badge; no Accept |
| Duplicate open lead phone | Non-blocking warning with link to existing lead |
| Health permission denied | Explain + deep link to OS settings |
| Food parse miss | Stay on composer; offer manual entry |

---

## Priority legend for build order (UI)

**P0 — ship first:** Auth, create gym, plans catalog, membership invite/accept + grants checklist, roster, check-in + desk mark, subscriptions/renewals/unpaid badges, trainer assign, catalog foods + diet assign + diary (complete + extras), workout assign + complete, progress/profile/BMI, health connect, notifications for invites/renewals/assign, offboard, block check-in, privacy management.

**P1 — next:** Dashboard widgets, lead → invite convert, workout clone/template, adherence % for staff, account erasure UX, richer unpaid digest layout.

---

## Glossary (UI copy)

Use these terms consistently in labels:

| Term | Meaning |
|---|---|
| Gym / your gym | The GymOrg the user is operating in |
| Membership | ACTIVE/INACTIVE relationship to a gym |
| Invite | Membership invite (Client) or staff invite (Trainer/Admin) |
| Base plan / Addon | Catalog kinds; addon capability “Personal training” for TRAINER_COACHING |
| Sharing / Privacy | DataGrants UI |
| Check-in | Attendance |
| Offboard | Set membership INACTIVE (not account delete) |
| Delete account | Erasure (P1) |

---

*End of product flows brief — aligned with PRD v2.3*
