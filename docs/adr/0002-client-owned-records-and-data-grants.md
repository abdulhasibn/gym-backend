# Client-owned records and DataGrants

**Status:** accepted

Personal fitness data (profile, progress, calories, wearables, assigned diet/workout plan instances and their completions) is owned by the User as `ClientOwnedRecord`s — never copied into a gym. Staff read access is consent-gated via `DataGrant` (profile attributes plus class grants: `PROGRESS`, `CALORIES`, `WEARABLES`, `DIET_PLANS`, `WORKOUT_PLANS`). Membership, invites, subscriptions, attendance, and leads remain `GymOwnedRecord`s. Personal logs carry no owning `gym_org_id`; assigned plans may store assigning-gym/trainer as provenance only.

This replaces the earlier MVP posture of gym-scoping metrics and deferring cross-gym share. Leave (`INACTIVE`) or revoke clears grants for that gym; a new gym gets a fresh checklist over the same Client-owned rows. Trainers may assign and edit plan definitions without the class grant; seeing completions/adherence requires it.

## Considered Options

- **Gym-scoped personal data (`gym_org_id` on logs)** — rejected: forces copies or silent reattach on rejoin, fights DPDP data-subject ownership, and contradicts Client-only access for nutrition/health in the matrix.
- **Ownership now, staff-share later** — rejected: partial consent rules hanging by data type; consent is in MVP for all Client-owned classes.
- **Auto-grant on plan assign** — rejected: silent re-consent after leave; assign works without grant, adherence stays grant-gated.
