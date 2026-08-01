# Gym SaaS Backend

Domain glossary for the Gym SaaS backend — a modular monolith serving Admin, Trainer, and Client personas for memberships, attendance, coaching, and lead pipeline.

## Language

**GymOrg**:
The tenant boundary — a single gym business, owned by one Admin user (`owner_user_id`) via `gym_org_id`. Carries `timezone` (default `Asia/Kolkata`) for calendar-day business rules. Owns organization lifecycle, branding, and invite issuance; lives in the `gym-orgs` feature module.
_Avoid_: Gym, Organization, Tenant (as entity names — use `GymOrg`; `gym_org_id` is the canonical field name)

**GymAdmin**:
A per-`GymOrg` staff affiliation for a User acting as Admin (`user_id`, `gym_org_id`). Multiple per org allowed (owner + capped desk Admins). Owned by `gym-orgs`.

**TrainerProfile**:
A per-`GymOrg` staff affiliation for a User acting as Trainer. Admin-as-Trainer = Admin user also has a `trainer_profiles` row in that org. Owned by `gym-orgs`; referenced by `memberships` and `coaching`.

**Role / RolePermission**:
Frozen seeded lookups (`roles`, `role_permissions`). `users.role_id` points at a role with `lane` `CLIENT` | `STAFF`. Gyms cannot edit. Authz = affiliation ∧ permission code.

**MembershipInvite**:
Admin-created client offer (email, base ± addon plans, payment). Pre-accept source of truth — no `client_memberships` row until accept. Shown in the client invitation list.

**StaffInvite**:
Admin-created staff offer to an existing STAFF-lane user (via `staff_code` / QR). Accept creates `trainer_profiles` and/or `gym_admins` and updates `role_id` to `TRAINER` or `ADMIN`.

**ClientMembership**:
Post-accept membership (`ACTIVE` | `INACTIVE`). At most one `ACTIVE` per client. Check-in requires ACTIVE + in-date base subscription.

**ClientOwnedRecord**:
Data whose row is owned by the User (Client), never copied into a gym. Staff at a `GymOrg` may read it only through an explicit grant. Includes: `ClientProfile` (and medical notes), `ProgressLog`, `CalorieLog`, `WearableConnection` (+ metrics), and assigned `DietPlan` / `WorkoutPlan` instances (with completions). Survives gym changes and rejoin; a new gym sees it only if newly granted. Personal logs/profile carry **no** `gym_org_id` — tenancy for staff access lives on `DataGrant` only. Assigned plan instances may store assigning-gym / trainer as **provenance**, not as owner.
_Avoid_: Gym-scoped personal data, per-membership copy of profile/progress/nutrition/health/plans, `gym_org_id` as owner on personal logs

**GymOwnedRecord**:
Tenant data owned by the `GymOrg`. No client grant required for staff to use it within that org. Includes: `ClientMembership`, `MembershipInvite`, `Subscription`, `Attendance`, `Lead`, and plan catalog / staff ops. `Attendance` is retained after the client leaves; it is the personal-data exception that stays with the gym.
_Avoid_: Calling membership or billing "client-owned"

**Erasure**:
A privileged DPDP path (not normal app soft-delete): hard-delete (or irreversible anonymize) all `ClientOwnedRecord`s and `DataGrant`s for the User; retain `GymOwnedRecord`s needed for ops/billing with personal pointers anonymized (including `Attendance`); retain `audit_logs` with subject/actor scrubbed to a tombstone; then delete the auth/`users` row. Leave (`INACTIVE`) only clears grants — it is not Erasure.
_Avoid_: Treating offboard as erasure; hard-delete of gym billing/attendance history on erasure

**Lead**:
A gym-owned CRM prospect (`GymOwnedRecord`). Phone is contact info only, not an identity key — duplicate phones at one gym are allowed; the app may warn on likely duplicates among open leads. Re-inquiry after `LOST` is a new lead row.
_Avoid_: Unique phone identity for leads; treating lead phone like auth identity

**DataGrant**:
Per-`GymOrg` consent for staff to read Client-owned data for a given Client (no data copy). Two shapes: (1) `ProfileAttributeGrant` — per `ClientProfile` field; (2) class-level grants — `PROGRESS`, `CALORIES`, `WEARABLES`, `DIET_PLANS`, `WORKOUT_PLANS`. Revoking or absence means staff cannot see that attribute or class. Distinct from `RolePermission` (what a role may do) — this is what the Client allowed that gym to see. On membership-invite accept, only DOB/HEIGHT/WEIGHT are required; class grants and other profile attributes are optional (default off) and editable later. Going `INACTIVE` at a gym, or an explicit revoke, ends all `DataGrant`s for that `(client, gym)`. Joining another gym starts a fresh checklist — grants never auto-carry between orgs. Trainer/Admin may **assign** diet/workout plan instances without the matching class grant (addon + affiliation still required). The assigning Trainer (or Admin-as-Trainer on that roster) may view/edit the plan **definition** without the class grant. The class grant gates seeing what the Client **did** with the plan (completions / adherence), not authoring. Other staff at the gym need the class grant for definition or adherence. After leave/revoke, no staff reads definition or adherence.
_Avoid_: Profile share, history handoff, copying rows between gyms, silent grant inheritance on rejoin, per-row or per-metric consents in MVP, auto-grant on assign

**ProfileAttributeGrant**:
A `DataGrant` over individual `ClientProfile` attributes (no cross-gym copy). DOB, HEIGHT, WEIGHT required on membership-invite accept; GENDER and MEDICAL_NOTES optional.
_Avoid_: Using this name for calorie/progress/plan grants — those are sibling grant classes under `DataGrant`

**CalorieLog**:
A Client's food diary (daily entry + items). A `ClientOwnedRecord`.
_Avoid_: Gym calorie log, nutrition log scoped to gym

**WearableConnection**:
A Client's link to a health provider (and the metrics that flow from it). A `ClientOwnedRecord`.
_Avoid_: Gym-scoped wearable, per-membership health sync

**ProgressLog**:
A Client's body-metrics / weight-trend history. A `ClientOwnedRecord` — not keyed by membership stint. Staff read only via `DataGrant`. Canonical source for weight over time (manual + wearable). `ClientProfile.weight_kg` is the maintained current weight derived from the latest progress weight (profile edits also write today's log).
_Avoid_: Gym-scoped progress, per-stint progress copy, independently writable profile weight that drifts from the log

**PlanCompletion**:
A per-calendar-day record that a Client completed a diet meal item or workout exercise. A `ClientOwnedRecord` child of the assigned plan instance — not a field on the plan template. Staff read (adherence) requires the matching `DIET_PLANS` / `WORKOUT_PLANS` class grant. Calendar day uses the assigning gym's timezone.
_Avoid_: `completed_at` on template items, one-shot completion

**SoftDelete**:
Mutable business entities use `deleted_at timestamptz NULL` (null = live), not a boolean. Repositories exclude non-null `deleted_at` by default. Distinct from lifecycle statuses and from `Erasure`.
_Avoid_: `is_deleted` boolean as the convention

**Subscription**:
Billing line for base or addon (`membership_plans.kind`). A `GymOwnedRecord`. Renew = new row. Soft-deleted via `deleted_at` like other mutable entities. Live dated lines for the same membership must not overlap within BASE, or within the same ADDON capability; at most one not-yet-started BASE (`start_date` null). Enforced in the database (exclusion over date ranges), not only in app code. Price and duration are **snapshotted** onto the line at creation; catalog changes do not rewrite historical amounts owed. Invites still carry no price snapshot.
_Avoid_: Overlapping in-date base/addon lines; claiming a partial unique on "in-date"; using live catalog price as the denominator for an existing line's payment status
