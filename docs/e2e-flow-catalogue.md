# E2E flow catalogue (IronCore story)

Story-driven Vitest journeys live under `src/app/tests/e2e/`.
Run with `pnpm test:e2e` (local Docker Supabase; same env as `pnpm test:integration`).

Status legend:

| Status | Meaning |
|--------|---------|
| `implemented` | Asserted in an E2E journey file |
| `covered_by_integration` | Covered by feature HTTP integration tests; not re-duplicated in E2E |
| `future` | Product route missing or deferred — do not assume live |

## Known product risks under test (v1)

1. Membership materialization after accept (ACTIVE + subscription snapshots + grants)
2. At most one ACTIVE membership per client
3. Payment status ≠ entitlement (unpaid in-date still check-in / coaching)
4. Check-in block independent of payment
5. CRM convert → PENDING invite → accept → ACTIVE member
6. Privacy lifecycle (grant → revoke → offboard → rejoin with fresh grants)
7. Cross-tenant isolation (IronCore vs Titan)
8. Wrong-actor refusals that protect money / ops

### Gaps found and fixed by this suite

| Gap | Fix |
|-----|-----|
| Admin client subscription list required ACTIVE membership, so billing history vanished after offboard | `ListClientSubscriptionsUseCase` now loads lines with `requireActive: false` |
| Assign trainer used UTC "today" while addon dates use gym timezone → false `COACHING_ADDON_REQUIRED` near midnight IST | `AssignTrainerUseCase` now uses gym-local clock |
## Flow IDs

| Flow ID | Scenario | Status | Where |
|---------|----------|--------|-------|
| AUTH-001 | Staff OTP → authenticated session → `/auth/me` | `implemented` | Journey A |
| AUTH-010 | Unauthenticated protected call | `covered_by_integration` | `auth.integration` |
| AUTH-011 | Invalid refresh | `covered_by_integration` | `auth.integration` |
| AUTH-020 | Google OAuth E2E | `future` | Provider live; automated E2E deferred |
| GYM-001 | Create IronCore Gym; owner is Admin | `implemented` | Journey A |
| GYM-010 | Client cannot create gym | `implemented` | Journey A |
| PLAN-001 | Create Base plan ₹1500 / 30d | `implemented` | Journey A |
| PLAN-002 | Create Trainer addon ₹2000 | `implemented` | Journey A |
| PLAN-010 | Soft-delete plan visibility | `covered_by_integration` | `plans.integration` |
| STAFF-001 | Invite Rizwan as Trainer → accept → trainer list | `implemented` | Journey A |
| STAFF-010 | Revoke then accept staff invite | `covered_by_integration` | `staff-invites.integration` |
| INVITE-001 | Admin creates membership invite (pending) | `implemented` | Journey B |
| MEMBER-001 | Accept → ACTIVE + BASE/ADDON snapshots + required grants | `implemented` | Journey B |
| MEMBER-002 | Duplicate accept of same invite | `implemented` | Journey B |
| MEMBER-010 | Staff email rejected at membership-invite create | `implemented` | Journey B |
| MEMBER-010b | Staff session cannot accept a client invite | `implemented` | Journey B |
| MEMBER-011 | Client ACTIVE at Gym A cannot accept Gym B invite | `implemented` | Journey B |
| GRANT-001 | Sameer optional class grants on accept | `implemented` | Journey B |
| GRANT-010 | Staff read after grant; deny after revoke | `implemented` | Journey I |
| GRANT-011 | Offboard clears gym grants / staff denied | `implemented` | Journey I |
| GRANT-012 | Rejoin other gym → fresh grants, no carry-over | `implemented` | Journey I |
| CRM-001 | Lead create → pipeline → convert → PENDING invite | `implemented` | Journey G |
| CRM-002 | Converted invite accept → ACTIVE membership | `implemented` | Journey G |
| CRM-010 | Duplicate open phone soft warning | `covered_by_integration` | `leads.integration` |
| SUB-001 | Unpaid Base still allows check-in | `implemented` | Journey H |
| SUB-002 | Unpaid Trainer addon still allows coaching assign | `implemented` | Journey H |
| SUB-003 | Admin payment mutation + renewals-due | `implemented` | Journey H |
| ATTEND-001 | First client check-in recorded | `implemented` | Journey H |
| BLOCK-001 | Paid + blocked → check-in fails; unblock while unpaid → succeeds | `implemented` | Journey H |
| OFFBOARD-001 | Offboard → INACTIVE roster; attendance + Admin billing history retained | `implemented` | Journey H |
| PRIV-001 | Attendance isolation across gyms after rejoin | `implemented` | Journey I |
| TENANT-001 | Admin A cannot read Gym B roster / leads / attendance | `implemented` | Journey J |
| TENANT-002 | Admin A cannot read Gym B subscriptions | `implemented` | Journey J |
| TENANT-003 | Staff A cannot read Gym B client-owned progress | `implemented` | Journey J |
| TENANT-004 | Trainer A cannot write coaching for Gym B client | `implemented` | Journey J |
| A8b | Mid-cycle addon attach / renew-as-new-row | `future` | Deferred in MVP roadmap |
| NOTIF-001 | Unpaid digest / renewal / lead follow-up jobs | `future` | Stint 3.5 |
| COACH-DIET-001 | Diet assign + complete | `covered_by_integration` | `diet-coaching.integration` |
| COACH-WORKOUT-001 | Workout assign + complete | `covered_by_integration` | `workout-coaching.integration` |
| NUTRITION-001 | Calorie log + staff CALORIES gate | `covered_by_integration` | `nutrition.integration` |
| HEALTH-001 | Wearable connect/sync + WEARABLES gate | `covered_by_integration` | `health-sync.integration` |

## Journey map

| Journey | File | Business question |
|---------|------|-------------------|
| A Bootstrap | `journey-a-bootstrap.e2e.test.ts` | Can Arif stand up a sellable gym with a trainer? |
| B Onboard | `journey-b-onboard.e2e.test.ts` | Does accept create a real billable member? |
| G CRM | `journey-g-crm-convert.e2e.test.ts` | Does convert grow membership, not only CRM status? |
| H Billing / access | `journey-h-billing-access.e2e.test.ts` | Unpaid still trains? Block stops entry? Offboard sticks? |
| I Privacy | `journey-i-privacy.e2e.test.ts` | Can staff see data they should not after revoke/offboard/rejoin? |
| J Tenant | `journey-j-tenant.e2e.test.ts` | Can Gym A ever read Gym B ops or client data? |

## Latest run report

After `pnpm test:e2e`, open [`docs/e2e-reports/latest.md`](e2e-reports/latest.md) for each Flow ID with expected vs actual app behaviour.
