# API reference index

Thin catalogue of shipped HTTP endpoints. Property-level docs (enums, examples) live in the linked guides.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman)

| Guide | Covers |
|-------|--------|
| [`client-auth.md`](client-auth.md) | Health, auth, gym orgs, staff invites |
| [`plans.md`](plans.md) | Membership plan catalog (Admin) |
| [`membership-invites.md`](membership-invites.md) | Membership invites, accept, DataGrants |
| [`subscriptions.md`](subscriptions.md) | Subscription payment, start override, Client list |
| [`roster.md`](roster.md) | Roster, trainer assign, offboard, check-in block |
| [`subscriptions.md`](subscriptions.md#admin--renewals-due-24) | Admin renewals due-list (2.4) |
| [`client-auth.md`](client-auth.md#client-surface-available-now) | Client attendance + profile/progress (2.1–2.2) |
| [`leads.md`](leads.md) | Mini-CRM leads |
| [`nutrition.md`](nutrition.md) | Food search, calorie diary, diet assign / complete (3.1) |

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` on JSON request/response bodies |
| Auth | `Authorization: Bearer <accessToken>` unless marked public |
| Errors | `{ "error": { "code": string, "message": string } }` — no field-level details |
| Pagination | Query `limit` (default **20**, max **100**), `offset` (default **0**). Page shape: `{ items, total, limit, offset }` |
| Timestamps | ISO-8601 UTC strings (e.g. `"2026-08-08T12:00:00.000Z"`) |
| UUIDs | RFC 4122 string IDs in path params and id fields |

---

## Endpoint catalogue

### Platform

| Method | Path | Guide |
|--------|------|-------|
| `GET` | `/health` | [client-auth § Health](client-auth.md#health) |

### Auth

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/auth/otp/request` | [client-auth § Request OTP](client-auth.md#request-otp) |
| `POST` | `/auth/otp/verify` | [client-auth § Verify OTP](client-auth.md#verify-otp-sign-in--provision) |
| `POST` | `/auth/refresh` | [client-auth § Refresh](client-auth.md#refresh-access-token) |
| `GET` | `/auth/me` | [client-auth § Current user](client-auth.md#current-user) |
| `GET` | `/auth/google/start` | [client-auth § Google](client-auth.md#google-optional) |
| `GET` | `/auth/google/callback` | [client-auth § Google](client-auth.md#google-optional) |
| `POST` | `/auth/google/complete` | [client-auth § Google complete](client-auth.md#complete-google-auth) |

### Gym orgs

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/gym-orgs` | [client-auth § Create gym](client-auth.md#create-gym-org) |
| `GET` | `/gym-orgs` | [client-auth § List gyms](client-auth.md#list-gym-orgs) |
| `GET` | `/gym-orgs/:gymOrgId` | [client-auth § Get gym](client-auth.md#get-gym-org) |
| `PATCH` | `/gym-orgs/:gymOrgId` | [client-auth § Patch gym](client-auth.md#update-gym-org) |
| `GET` | `/gym-orgs/:gymOrgId/trainers` | [client-auth § List trainers](client-auth.md#list-gym-trainers) |

### Staff invites

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/gym-orgs/:gymOrgId/staff-invites` | [client-auth § Create staff invite](client-auth.md#create-staff-invite) |
| `GET` | `/gym-orgs/:gymOrgId/staff-invites` | [client-auth § List staff invites](client-auth.md#list-staff-invites) |
| `GET` | `/gym-orgs/staff-invites/inbox` | [client-auth § Staff invite inbox](client-auth.md#staff-invite-inbox) |
| `POST` | `/gym-orgs/staff-invites/:inviteId/accept` | [client-auth § Accept staff invite](client-auth.md#accept-staff-invite) |
| `POST` | `/gym-orgs/staff-invites/:inviteId/revoke` | [client-auth § Revoke staff invite](client-auth.md#revoke-staff-invite) |

### Plans

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/gym-orgs/:gymOrgId/plans` | [plans § Create](plans.md#create-plan) |
| `GET` | `/gym-orgs/:gymOrgId/plans` | [plans § List](plans.md#list-plans) |
| `GET` | `/gym-orgs/:gymOrgId/plans/:planId` | [plans § Get](plans.md#get-plan) |
| `PATCH` | `/gym-orgs/:gymOrgId/plans/:planId` | [plans § Update](plans.md#update-plan) |
| `DELETE` | `/gym-orgs/:gymOrgId/plans/:planId` | [plans § Delete](plans.md#delete-plan) |

### Membership invites + DataGrants

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/gym-orgs/:gymOrgId/membership-invites` | [membership-invites § Create](membership-invites.md#admin--create-invite) |
| `GET` | `/gym-orgs/:gymOrgId/membership-invites` | [membership-invites § List](membership-invites.md#admin--list-invites) |
| `POST` | `/gym-orgs/:gymOrgId/membership-invites/:inviteId/revoke` | [membership-invites § Revoke](membership-invites.md#admin--revoke) |
| `GET` | `/membership-invites/inbox` | [membership-invites § Inbox](membership-invites.md#client--inbox) |
| `POST` | `/membership-invites/:inviteId/accept` | [membership-invites § Accept](membership-invites.md#client--accept) |
| `GET` | `/gym-orgs/:gymOrgId/my-data-grants` | [membership-invites § Get grants](membership-invites.md#client--get-datagrants) |
| `PUT` | `/gym-orgs/:gymOrgId/my-data-grants` | [membership-invites § Update grants](membership-invites.md#client--update-datagrants) |

### Subscriptions

| Method | Path | Guide |
|--------|------|-------|
| `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions` | [subscriptions § Admin list](subscriptions.md#admin--list-client-subscriptions) |
| `PATCH` | `/gym-orgs/:gymOrgId/subscriptions/:subscriptionId/payment` | [subscriptions § Payment](subscriptions.md#admin--update-payment) |
| `POST` | `/gym-orgs/:gymOrgId/subscriptions/:subscriptionId/start-override` | [subscriptions § Start override](subscriptions.md#admin--start-override-a19) |
| `GET` | `/gym-orgs/:gymOrgId/my-subscriptions` | [subscriptions § Client list](subscriptions.md#client--my-subscriptions-c10) |
| `GET` | `/gym-orgs/:gymOrgId/subscriptions/renewals-due` | [subscriptions § Renewals due](subscriptions.md#admin--renewals-due-24) |

### Attendance

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/gym-orgs/:gymOrgId/attendances/check-in` | [client-auth § CLIENT surface](client-auth.md#client-surface-available-now) |
| `POST` | `/gym-orgs/:gymOrgId/attendances/desk-mark` | Admin desk mark (2.1) |
| `GET` | `/gym-orgs/:gymOrgId/attendances` | Gym-day list (2.1) |
| `GET` | `/gym-orgs/:gymOrgId/attendances/clients/:clientUserId` | Per-client history (2.1) |
| `GET` | `/gym-orgs/:gymOrgId/my-attendances` | [client-auth § CLIENT surface](client-auth.md#client-surface-available-now) |

### Profile & progress

| Method | Path | Guide |
|--------|------|-------|
| `GET` | `/me/profile` | [client-auth § CLIENT surface](client-auth.md#client-surface-available-now) |
| `PATCH` | `/me/profile` | [client-auth § CLIENT surface](client-auth.md#client-surface-available-now) |
| `GET` | `/me/progress-logs` | [client-auth § CLIENT surface](client-auth.md#client-surface-available-now) |
| `PUT` | `/me/progress-logs` | [client-auth § CLIENT surface](client-auth.md#client-surface-available-now) |
| `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/profile` | Staff grant-gated (2.3) |
| `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/progress-logs` | Staff grant-gated (2.3) |

### Roster

| Method | Path | Guide |
|--------|------|-------|
| `GET` | `/gym-orgs/:gymOrgId/members` | [roster § Admin list](roster.md#admin--list-gym-members) |
| `GET` | `/gym-orgs/:gymOrgId/my-assigned-members` | [roster § Assigned](roster.md#trainer--assigned-members) |
| `POST` | `/gym-orgs/:gymOrgId/members/:membershipId/assign-trainer` | [roster § Assign](roster.md#admin--assign--reassign-trainer) |
| `POST` | `/gym-orgs/:gymOrgId/members/:membershipId/offboard` | [roster § Offboard](roster.md#admin--offboard) |
| `PATCH` | `/gym-orgs/:gymOrgId/members/:membershipId/check-in-block` | [roster § Block](roster.md#admin--block--unblock-check-in) |

### Leads

| Method | Path | Guide |
|--------|------|-------|
| `POST` | `/gym-orgs/:gymOrgId/leads` | [leads § Create](leads.md#create-lead) |
| `GET` | `/gym-orgs/:gymOrgId/leads` | [leads § List](leads.md#list-leads) |
| `GET` | `/gym-orgs/:gymOrgId/leads/due-follow-ups` | [leads § Due follow-ups](leads.md#due-follow-ups) |
| `GET` | `/gym-orgs/:gymOrgId/leads/:leadId` | [leads § Get](leads.md#get-lead) |
| `PATCH` | `/gym-orgs/:gymOrgId/leads/:leadId` | [leads § Update](leads.md#update-lead) |
| `PATCH` | `/gym-orgs/:gymOrgId/leads/:leadId/status` | [leads § Change status](leads.md#change-lead-status) |
| `DELETE` | `/gym-orgs/:gymOrgId/leads/:leadId` | [leads § Soft-delete](leads.md#soft-delete-lead) |

### Nutrition & diet (3.1)

| Method | Path | Guide |
|--------|------|-------|
| `GET` | `/foods/search` | [nutrition § Search](nutrition.md#search-catalog) |
| `GET` | `/me/calorie-logs` | [nutrition § Client diary](nutrition.md#client-diary) |
| `POST` | `/me/calorie-logs/items` | [nutrition § Log extra](nutrition.md#log-extra) |
| `DELETE` | `/me/calorie-logs/items/:itemId` | [nutrition § Unlog extra](nutrition.md#unlog-extra) |
| `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/calorie-logs` | [nutrition § Staff diary](nutrition.md#staff-diary-calories-grant) |
| `POST` | `/gym-orgs/:gymOrgId/clients/:clientUserId/diet-plans` | [nutrition § Assign](nutrition.md#assign) |
| `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/diet-plans` | [nutrition § Staff get](nutrition.md#staff-get-definition) |
| `GET` | `/gym-orgs/:gymOrgId/my-diet-plan` | [nutrition § Client my plan](nutrition.md#client-my-plan) |
| `POST` | `/gym-orgs/:gymOrgId/my-diet-plan/items/:itemId/complete` | [nutrition § Complete](nutrition.md#complete--uncomplete) |
| `DELETE` | `/gym-orgs/:gymOrgId/my-diet-plan/items/:itemId/complete` | [nutrition § Complete](nutrition.md#complete--uncomplete) |
| `POST` | `/gym-orgs/:gymOrgId/diet-plan-templates` | [nutrition § Gym diet templates](nutrition.md#gym-diet-templates) |
| `GET` | `/gym-orgs/:gymOrgId/diet-plan-templates` | [nutrition § Gym diet templates](nutrition.md#gym-diet-templates) |
| `GET` | `/gym-orgs/:gymOrgId/diet-plan-templates/:templateId` | [nutrition § Gym diet templates](nutrition.md#gym-diet-templates) |
| `POST` | `/gym-orgs/:gymOrgId/diet-plan-templates/:templateId/duplicate` | [nutrition § Gym diet templates](nutrition.md#gym-diet-templates) |
| `PATCH` | `/gym-orgs/:gymOrgId/diet-plan-templates/:templateId` | [nutrition § Gym diet templates](nutrition.md#gym-diet-templates) |
| `DELETE` | `/gym-orgs/:gymOrgId/diet-plan-templates/:templateId` | [nutrition § Gym diet templates](nutrition.md#gym-diet-templates) |

### Coaching workouts (3.2)

| Method | Path | Guide |
|--------|------|-------|
| `GET` | `/exercises/search` | [coaching § Search](coaching.md#search-catalog) |
| `POST` | `/gym-orgs/:gymOrgId/clients/:clientUserId/workout-plans` | [coaching § Assign](coaching.md#assign) |
| `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/workout-plans` | [coaching § Staff get](coaching.md#staff-get-definition) |
| `GET` | `/gym-orgs/:gymOrgId/my-workout-plan` | [coaching § Client my plan](coaching.md#client-my-plan) |
| `POST` | `/gym-orgs/:gymOrgId/my-workout-plan/items/:itemId/complete` | [coaching § Complete](coaching.md#complete--uncomplete) |
| `DELETE` | `/gym-orgs/:gymOrgId/my-workout-plan/items/:itemId/complete` | [coaching § Complete](coaching.md#complete--uncomplete) |

---

## Not shipped yet

Broader food/exercise seed, CustomFood / CustomExercise APIs, gym workout templates, staff `WORKOUT_PLANS` adherence overlay, health sync, CRM convert (A14), push/jobs, audit writes, A8b addon attach/renew — see [`MVP_ROADMAP.md`](MVP_ROADMAP.md).
