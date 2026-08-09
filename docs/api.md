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
| [`leads.md`](leads.md) | Mini-CRM leads |

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

---

## Not shipped yet

Admin subscription manage, roster / offboard / block, attendance, client profile/progress, renewals, coaching, calories, health sync, push — see [`MVP_ROADMAP.md`](MVP_ROADMAP.md).
