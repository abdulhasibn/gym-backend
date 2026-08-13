# Client auth & CLIENT app integration

Brief guide for mobile/web (and AI agents) integrating with the gym Backend API.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) — request docs + Examples  
**Plans:** [`plans.md`](plans.md) · **Membership join / grants:** [`membership-invites.md`](membership-invites.md) · **Subscriptions:** [`subscriptions.md`](subscriptions.md) · **Roster (staff):** [`roster.md`](roster.md) · **Leads:** [`leads.md`](leads.md)  
**Roadmap / status:** [`MVP_ROADMAP.md`](MVP_ROADMAP.md) · [`PROGRESS.md`](PROGRESS.md)

There is **no separate sign-up**. First successful OTP verify or Google complete **creates** the app user. Later logins return the same user.

---

## CLIENT surface available now

Use lane `CLIENT` on first provision. Staff-only routes (gym create, leads, plan catalog Admin, invite **create**) return `403` for CLIENT.

| Area | Endpoints | Notes |
|------|-----------|--------|
| Auth | `POST /auth/otp/request`, `/otp/verify`, `/refresh`; Google start/complete; `GET /auth/me` | This guide |
| Invite inbox | `GET /membership-invites/inbox` | Pending invites by user/email + gym profile |
| Accept join | `POST /membership-invites/:id/accept` | ACTIVE membership + sub snapshots; one ACTIVE max |
| DataGrants | `GET` / `PUT /gym-orgs/:gymOrgId/my-data-grants` | Required DOB/HEIGHT/WEIGHT sticky; optional toggles |
| Subscriptions | `GET /gym-orgs/:gymOrgId/my-subscriptions` | Base + addon lines (C10); see [`subscriptions.md`](subscriptions.md) |
| Check-in | `POST /gym-orgs/:gymOrgId/attendances/check-in` | ACTIVE + not blocked + in-date (or unstarted) BASE |
| My attendance | `GET /gym-orgs/:gymOrgId/my-attendances` | Own gym-owned history |
| Profile | `GET` / `PATCH /me/profile` | Height, DOB, gender, medical; weight via progress |
| Progress | `GET` / `PUT /me/progress-logs` | Weight history + BMI |
| Health | `GET /health` | Liveness |

**Not yet for CLIENT:** coaching, calories, health sync, push — Stint 3 ([Orbit](https://gym-prd-visual.vercel.app/#orbit)). Staff roster / assign / offboard / block: [`roster.md`](roster.md). Staff attendance + grant-gated profile/progress: [`api.md`](api.md).

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` on request/response bodies |
| Auth header | `Authorization: Bearer <accessToken>` |
| Errors | Always `{ "error": { "code": string, "message": string } }` — no field-level details |
| Lane | `CLIENT` or `STAFF` — required on **first** provision; omit on returning OTP verify. Cannot change later (`LANE_MISMATCH` if a different lane is sent) |
| Session / refresh | Refresh tokens rotate on each use; replace the stored value after every `/auth/refresh`. TTLs follow Supabase project defaults (`expiresIn` from the session response). |
| Pagination | `limit` default **20**, max **100**; `offset` default **0**. Page: `{ items, total, limit, offset }` |

Store after login: `accessToken`, `refreshToken`, `userId`, `lane`, `roleCode`.

### Shared response shapes

**`user`**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | App user id | `"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"` |
| `email` | string | Normalized email | `"member@example.com"` |
| `name` | string | Display name | `"Member"` |
| `lane` | enum | Account lane (immutable after provision) | `CLIENT` \| `STAFF` |
| `roleCode` | enum | Effective role | `CLIENT` \| `STAFF_UNASSIGNED` \| `TRAINER` \| `ADMIN` |
| `staffCode` | string \| null | Staff lookup code; null for CLIENT | `"STAFF-AB12"` or `null` |
| `emailVerifiedAt` | string (ISO) \| null | When email was verified | `"2026-08-02T00:00:00.000Z"` |

**`session`**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `accessToken` | string | Bearer token for API calls | JWT string |
| `refreshToken` | string | Rotating refresh token | opaque string |
| `expiresIn` | number | Access token TTL in seconds | `3600` |

**`gymOrg` (detail)**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | Gym org id | `"33333333-3333-4333-8333-333333333333"` |
| `name` | string | Gym name (1–255) | `"North Star Fitness"` |
| `address` | string \| null | Street / locality | `"12 Lift St"` or `null` |
| `contactPhone` | string \| null | Desk phone | `"+15550001111"` or `null` |
| `contactEmail` | string \| null | Desk email | `"hello@example.com"` or `null` |
| `logoUrl` | string \| null | Absolute URL | `"https://cdn.example/logo.png"` or `null` |
| `timezone` | string (IANA) | Gym timezone | `"Asia/Kolkata"` |
| `ownerUserId` | string (uuid) | Owner user id | `"cccccccc-cccc-4ccc-8ccc-cccccccccccc"` |
| `createdAt` | string (ISO) | Created at | `"2026-08-08T12:00:00.000Z"` |
| `updatedAt` | string (ISO) | Updated at | `"2026-08-08T12:00:00.000Z"` |
| `isOwner` | boolean | Present on get (and list summary); whether actor owns this gym | `true` |

**`staffInvite`**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | Invite id | `"11111111-1111-4111-8111-111111111111"` |
| `gymOrgId` | string (uuid) | Target gym | `"33333333-3333-4333-8333-333333333333"` |
| `invitedUserId` | string (uuid) | Invitee user id (resolved via `staffCode`) | `"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"` |
| `targetRole` | enum | Role granted on accept | `TRAINER` \| `ADMIN` |
| `status` | enum | Invite lifecycle | `PENDING` \| `ACCEPTED` \| `REVOKED` \| `EXPIRED` |
| `expiresAt` | string (ISO) \| null | Expiry; past `expiresAt` may show as `EXPIRED` on read | `"2026-08-22T00:00:00.000Z"` |
| `createdBy` | string (uuid) | Admin who created the invite | `"cccccccc-cccc-4ccc-8ccc-cccccccccccc"` |
| `acceptedAt` | string (ISO) \| null | When accepted | `null` until accept |
| `createdAt` | string (ISO) | Created at | `"2026-08-08T12:00:00.000Z"` |
| `updatedAt` | string (ISO) | Updated at | `"2026-08-08T12:00:00.000Z"` |

---

## Health

`GET /health` — public

**200**

```json
{ "status": "ok", "timestamp": "2026-08-08T12:00:00.000Z" }
```

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `status` | yes | string | Liveness marker | `"ok"` |
| `timestamp` | yes | string (ISO) | Server time when handled | `"2026-08-08T12:00:00.000Z"` |

---

## Email OTP (primary)

```
1. Collect email
2. POST /auth/otp/request   { email }  →  { status, isNewUser }
3. If isNewUser, collect lane (+ optional name); otherwise skip lane
4. User enters code from email
5. POST /auth/otp/verify    { email, token, lane?, name? }
6. Persist session.accessToken (+ refreshToken, expiresIn)
7. Use Bearer token for /auth/me, /gym-orgs, …
8. Before access expires (or on 401), POST /auth/refresh with refreshToken
```

### Request OTP

`POST /auth/otp/request` — public

```json
{ "email": "member@example.com" }
```

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `email` | yes | string | Inbox that will receive the OTP; normalized server-side | `"member@example.com"` |

**202 response**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `status` | enum | Delivery accepted | `OTP_SENT` |
| `isNewUser` | boolean | `true` if no live app account for this email yet — client should collect `lane` (and optional `name`) before verify; `false` = returning user, omit `lane` on verify | `true` |

Errors: **422** `VALIDATION_ERROR` / `EMAIL_ADDRESS_INVALID` · **429** `AUTH_RATE_LIMITED` · **502** `OTP_DELIVERY_FAILED`

### Verify OTP (sign-in = provision)

`POST /auth/otp/verify` — public

```json
{
  "email": "member@example.com",
  "token": "123456",
  "lane": "CLIENT",
  "name": "Member"
}
```

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `email` | yes | string | Same email used in request | `"member@example.com"` |
| `token` | yes | string | Digits only after strip; length 6–10 (project OTP is currently **6**) | `"123456"` |
| `lane` | first provision only | enum | Account lane; omit on returning sign-in | `CLIENT` \| `STAFF` |
| `name` | no | string | Display name, 1–120 chars after trim | `"Member"` |

Paste the **full** code from the email (subject + body show `{{ .Token }}`). Partial codes fail as `OTP_EXPIRED`.

**200**

```json
{
  "session": { "accessToken": "…", "refreshToken": "…", "expiresIn": 3600 },
  "user": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "email": "member@example.com",
    "name": "Member",
    "lane": "CLIENT",
    "roleCode": "CLIENT",
    "staffCode": null,
    "emailVerifiedAt": "2026-08-02T00:00:00.000Z"
  }
}
```

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `session` | object | See [session](#shared-response-shapes) | — |
| `user` | object | See [user](#shared-response-shapes) | STAFF first login: `roleCode` = `STAFF_UNASSIGNED`, `staffCode` non-null |

Errors: **422** `OTP_EXPIRED` (wrong **or** expired) / `VALIDATION_ERROR` / `EMAIL_NOT_VERIFIED` / `LANE_REQUIRED` · **409** `LANE_MISMATCH`

**Postman tip:** set env `email` to the inbox you read, run Request OTP once, paste the full code into `otpToken`, then Verify. Re-requesting invalidates the previous code. Wait ~60s between requests if you hit `AUTH_RATE_LIMITED`.

---

## Google (optional)

```
1. Open GET /auth/google/start in a browser / in-app browser (302 → Supabase Google)
2. After consent, capture access_token **and** refresh_token from the callback URL hash
3. POST /auth/google/complete  with Bearer that access token
4. Body: { lane, name? }  →  { user }  (tokens are NOT rotated — keep both from the hash)
5. Use POST /auth/refresh with the stored refresh_token when the access token expires
```

`GET /auth/google/start` — public — **302** redirect to Supabase Google authorize (no JSON body).  
`GET /auth/google/callback` — public — HTML helper that reads tokens from the URL hash (no JSON API contract).

### Complete Google auth

`POST /auth/google/complete` — Bearer (identity from Google access token)

```json
{
  "lane": "CLIENT",
  "name": "Member"
}
```

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `lane` | yes | enum | Account lane for first provision; must match if already provisioned | `CLIENT` \| `STAFF` |
| `name` | no | string | Display name, 1–120 chars | `"Member"` |

**200** `{ "user": { …same shape as OTP… } }` — see [user](#shared-response-shapes).

Errors: **401** `AUTHENTICATION_FAILED` · **422** `GOOGLE_IDENTITY_REQUIRED` / `EMAIL_NOT_VERIFIED` / `VALIDATION_ERROR` · **409** `LANE_MISMATCH`

---

## Session

### Refresh access token

`POST /auth/refresh` — public (body carries the refresh token)

```json
{ "refreshToken": "…" }
```

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `refreshToken` | yes | string (min 1) | Current refresh token from last login/refresh | opaque string from session |

**200**

```json
{
  "session": {
    "accessToken": "…",
    "refreshToken": "…",
    "expiresIn": 3600
  }
}
```

Always persist the **new** `refreshToken` (rotation invalidates the previous one).

Errors: **401** `AUTHENTICATION_FAILED` · **422** `VALIDATION_ERROR`

### Current user

`GET /auth/me` — Bearer (provisioned user)

**200** `{ "user": { … } }` — see [user](#shared-response-shapes).

Errors: **401** `AUTHENTICATION_FAILED` — missing/invalid token, or identity exists but app user not provisioned yet.

Call after cold start to restore UI from a stored token. On `401` from a protected call, try `/auth/refresh` once; if that fails, send the user through OTP/Google again.

---

## Gym orgs (STAFF after login)

Requires Bearer. Create only if `roleCode` is `STAFF_UNASSIGNED` or `ADMIN`.

### Create gym org

`POST /gym-orgs` — Bearer STAFF

```json
{
  "name": "North Star Fitness",
  "address": null,
  "contactPhone": null,
  "contactEmail": "hello@example.com",
  "logoUrl": null,
  "timezone": "Asia/Kolkata"
}
```

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `name` | yes | string | Gym name, 1–255 after trim | `"North Star Fitness"` |
| `address` | no | string \| null | Free-text address, max 2000; empty → `null` | `"12 Lift St"` or `null` |
| `contactPhone` | no | string \| null | Desk phone, max 50 | `"+15550001111"` or `null` |
| `contactEmail` | no | string \| null | Valid email or null, max 255 | `"hello@example.com"` or `null` |
| `logoUrl` | no | string \| null | Absolute URL or null, max 2048 | `"https://cdn.example/logo.png"` or `null` |
| `timezone` | no | string (IANA) | Defaults to `Asia/Kolkata` if omitted | `"Asia/Kolkata"` |

**201** `{ "gymOrg": { … } }` — see [gymOrg](#shared-response-shapes) (create response omits `isOwner`).

Errors: **403** `GYM_ORG_CREATION_FORBIDDEN` (e.g. CLIENT lane) · **422** `VALIDATION_ERROR`

### List gym orgs

`GET /gym-orgs` — Bearer affiliated staff

**200**

```json
{
  "gymOrgs": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "name": "North Star Fitness",
      "timezone": "Asia/Kolkata",
      "isOwner": true
    }
  ]
}
```

**`gymOrgs[]` item**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | Gym org id | `"33333333-3333-4333-8333-333333333333"` |
| `name` | string | Gym name | `"North Star Fitness"` |
| `timezone` | string (IANA) | Gym timezone | `"Asia/Kolkata"` |
| `isOwner` | boolean | Whether the actor owns this gym | `true` |

May be `[]` if the staff user has no affiliations yet.

### Get gym org

`GET /gym-orgs/:gymOrgId` — Bearer affiliated staff

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym to load | `"33333333-3333-4333-8333-333333333333"` |

**200** `{ "gymOrg": { …detail…, "isOwner": true } }` — see [gymOrg](#shared-response-shapes).

### Update gym org

`PATCH /gym-orgs/:gymOrgId` — Bearer ADMIN at that gym

Body same shape as [create](#create-gym-org) (`name` + optionals + `timezone`).

**200** `{ "gymOrg": { … } }`

Errors: **403** `GYM_ORG_WRITE_FORBIDDEN` · **404** `NOT_FOUND` · **422** `VALIDATION_ERROR`

---

## Staff invites (in-app; `staff_code` / QR — not email tokens)

Admin at the gym creates an invite targeting another STAFF user’s `staffCode`. Invitee accepts from inbox. Max **3** admins including owner + pending ADMIN invites.

### Create staff invite

`POST /gym-orgs/:gymOrgId/staff-invites` — Bearer ADMIN

```json
{
  "staffCode": "STAFF-AB12",
  "targetRole": "TRAINER",
  "expiresAt": "2026-08-22T00:00:00.000Z"
}
```

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym issuing the invite | `"33333333-3333-4333-8333-333333333333"` |

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `staffCode` | yes | string | Invitee’s staff code (1–64 after trim) | `"STAFF-AB12"` |
| `targetRole` | yes | enum | Role to grant on accept | `TRAINER` \| `ADMIN` |
| `expiresAt` | no | string (ISO date) | Defaults to **+14 days** if omitted | `"2026-08-22T00:00:00.000Z"` |

**201** `{ "staffInvite": { … } }` — see [staffInvite](#shared-response-shapes).

### List staff invites

`GET /gym-orgs/:gymOrgId/staff-invites?limit=20&offset=0` — Bearer ADMIN

**Query params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `limit` | no | integer | Page size, 1–100, default 20 | `20` |
| `offset` | no | integer | Skip count, default 0 | `0` |

**200** `{ "staffInvites": { "items": [ /* staffInvite */ ], "total": 1, "limit": 20, "offset": 0 } }`

### Staff invite inbox

`GET /gym-orgs/staff-invites/inbox?limit=20&offset=0` — Bearer STAFF invitee

Past `expiresAt` show as `EXPIRED` without a write. Each item embeds `gym`. Soft-deleted gyms are omitted.

**Query params** — same as list (`limit`, `offset`).

**Inbox item** = [staffInvite](#shared-response-shapes) + nested `gym`:

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `gym.id` | string (uuid) | Gym id | `"33333333-3333-4333-8333-333333333333"` |
| `gym.name` | string | Gym name | `"Iron Temple"` |
| `gym.address` | string \| null | Address | `"12 Lift St"` |
| `gym.contactPhone` | string \| null | Phone | `"+15550001111"` |
| `gym.contactEmail` | string \| null | Email | `"desk@irontemple.example"` |
| `gym.logoUrl` | string \| null | Logo URL | `null` |
| `gym.timezone` | string (IANA) | Timezone | `"Asia/Kolkata"` |

### Accept staff invite

`POST /gym-orgs/staff-invites/:inviteId/accept` — Bearer invitee  
Body: none.

Creates affiliations + role upgrade (`TRAINER` or desk `ADMIN`; Admin-as-Trainer also gets a trainer profile).

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `inviteId` | yes | string (uuid) | Pending invite | `"11111111-1111-4111-8111-111111111111"` |

**200** `{ "staffInvite": { …, "status": "ACCEPTED", "acceptedAt": "…" } }`

### Revoke staff invite

`POST /gym-orgs/staff-invites/:inviteId/revoke` — Bearer ADMIN  
Body: none. Only `PENDING` → `REVOKED`.

**200** `{ "staffInvite": { …, "status": "REVOKED" } }`

Useful errors: `STAFF_INVITE_FORBIDDEN` · `INVALID_STAFF_INVITEE` · `STAFF_ALREADY_AFFILIATED` · `STAFF_INVITE_ADMIN_CAP` · `STAFF_INVITE_EXPIRED` · `STAFF_INVITE_INVALID_TRANSITION` · `NOT_FOUND`

---

## CLIENT UX checklist

1. **No “Sign up” vs “Log in”** — one auth path; first success creates the account.
2. Ask for **lane** only when OTP request returns `isNewUser: true` (or hard-code `CLIENT` in the member app). Omit lane on returning verify.
3. On `LANE_MISMATCH`, tell the user this email belongs to the other account type.
4. On `OTP_EXPIRED`, send them back to request a new code.
5. On API `401`, try `POST /auth/refresh` once with the stored refresh token; replace both tokens on success; re-login if refresh fails.
6. After login: poll **`GET /membership-invites/inbox`**; on accept use the Sharing checklist (required vitals locked on) — see [`membership-invites.md`](membership-invites.md).
7. Treat any non-2xx as `{ error.code }` — branch UI on `code`, show `message` as fallback.
8. Prefer Postman **Examples** on each request when generating clients.
