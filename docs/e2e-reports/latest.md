# IronCore E2E flow report

Generated: `2026-08-25T18:35:03.142Z`

Run status: **passed**

| Metric | Count |
|--------|------:|
| PASS | 29 |
| FAIL | 0 |
| SKIP | 0 |
| NOT_RUN | 0 |
| Total flow IDs | 29 |

## Flows

| Flow ID | Result | Journey | Expected app behaviour | Actual app behaviour |
|---------|--------|---------|------------------------|----------------------|
| ATTEND-001 | PASS | Journey H | Attendance row created for Sameer at IronCore | Matched expected behaviour (all assertions passed) |
| AUTH-001 | PASS | Journey A | Arif gets an authenticated STAFF session and /auth/me shows ADMIN after gym create | Matched expected behaviour (all assertions passed) |
| BLOCK-001 | PASS | Journey H | Paid+blocked check-in fails; unpaid+unblocked check-in succeeds | Matched expected behaviour (all assertions passed) |
| CRM-001 | PASS | Journey G | Lead CONVERTED; membership invite PENDING with invited email | Matched expected behaviour (all assertions passed) |
| CRM-002 | PASS | Journey G | Fahad accepts convert-created invite → ACTIVE + BASE/ADDON lines | Matched expected behaviour (all assertions passed) |
| GRANT-001 | PASS | Journey B | Chosen class grants (PROGRESS/CALORIES/…) present; MEDICAL_NOTES not auto-granted as class | Matched expected behaviour (all assertions passed) |
| GRANT-010 | PASS | Journey I | Staff calorie read 200 with grant; 403 after CALORIES revoked | Matched expected behaviour (all assertions passed) |
| GRANT-011 | PASS | Journey I | After offboard, staff progress/calories 403; client grants at gym fail | Matched expected behaviour (all assertions passed) |
| GRANT-012 | PASS | Journey I | Titan accept starts without IronCore class grants; Titan staff denied | Matched expected behaviour (all assertions passed) |
| GYM-001 | PASS | Journey A | Gym exists; Arif is Admin owner of IronCore Gym | Matched expected behaviour (all assertions passed) |
| GYM-010 | PASS | Journey A | CLIENT lane receives 403 on POST /gym-orgs | Matched expected behaviour (all assertions passed) |
| INVITE-001 | PASS | Journey B | PENDING invite created; Sameer not yet on ACTIVE roster | Matched expected behaviour (all assertions passed) |
| MEMBER-001 | PASS | Journey B | ACTIVE membership; BASE ₹1500 + ADDON ₹2000 snapshots; required DOB/HEIGHT/WEIGHT grants | Matched expected behaviour (all assertions passed) |
| MEMBER-002 | PASS | Journey B | Second accept 4xx; still exactly one ACTIVE membership | Matched expected behaviour (all assertions passed) |
| MEMBER-010 | PASS | Journey B | POST membership-invites returns 422 INVALID_MEMBERSHIP_INVITEE | Matched expected behaviour (all assertions passed) |
| MEMBER-010b | PASS | Journey B | Staff bearer on accept returns 4xx; no membership created | Matched expected behaviour (all assertions passed) |
| MEMBER-011 | PASS | Journey B | ACTIVE at IronCore → Titan invite accept rejected; Titan has no ACTIVE row | Matched expected behaviour (all assertions passed) |
| OFFBOARD-001 | PASS | Journey H | Roster INACTIVE; check-in denied; attendance history retained; Admin still lists subscriptions | Matched expected behaviour (all assertions passed) |
| PLAN-001 | PASS | Journey A | BASE plan listed with price 1500 and duration 30 | Matched expected behaviour (all assertions passed) |
| PLAN-002 | PASS | Journey A | ADDON plan with TRAINER_COACHING capability listed at price 2000 | Matched expected behaviour (all assertions passed) |
| PRIV-001 | PASS | Journey I | Titan gym-day / client attendance totals stay 0; IronCore history remains | Matched expected behaviour (all assertions passed) |
| STAFF-001 | PASS | Journey A | Rizwan accepts; roleCode TRAINER; appears on gym trainer list | Matched expected behaviour (all assertions passed) |
| SUB-001 | PASS | Journey H | Base paymentStatus unpaid → POST check-in still 201 | Matched expected behaviour (all assertions passed) |
| SUB-002 | PASS | Journey H | Addon unpaid but in-date → trainer diet assign still 201 | Matched expected behaviour (all assertions passed) |
| SUB-003 | PASS | Journey H | partial→paid and start-override succeed; renewals-due includes the line | Matched expected behaviour (all assertions passed) |
| TENANT-001 | PASS | Journey J | IronCore Admin gets 4xx on Titan members, leads, attendances | Matched expected behaviour (all assertions passed) |
| TENANT-002 | PASS | Journey J | IronCore Admin cannot list/mutate Titan client subscriptions | Matched expected behaviour (all assertions passed) |
| TENANT-003 | PASS | Journey J | Staff cannot read Bilal progress via Titan or wrong gym path | Matched expected behaviour (all assertions passed) |
| TENANT-004 | PASS | Journey J | IronCore trainer diet assign on Titan client returns 4xx | Matched expected behaviour (all assertions passed) |

## How to read this

- **PASS** — the app behaved as the business rule requires (assertions held).
- **FAIL** — the app behaved differently; treat as a product/flow gap.
- **NOT_RUN** — Flow ID is in the catalogue but was not exercised in this run.

Machine-readable twin: [`latest.json`](./latest.json).

