# Client auth integration

Brief guide for mobile/web (and AI agents) integrating with the gym Backend API.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) — request docs + Examples

There is **no separate sign-up**. First successful OTP verify or Google complete **creates** the app user. Later logins return the same user.

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` on request/response bodies |
| Auth header | `Authorization: Bearer <accessToken>` |
| Errors | Always `{ "error": { "code": string, "message": string } }` — no field-level details |
| Lane | `CLIENT` or `STAFF` — required on **first** provision; omit on returning OTP verify. Cannot change later (`LANE_MISMATCH` if a different lane is sent) |
| Session / refresh | Refresh tokens rotate on each use; replace the stored value after every `/auth/refresh`. TTLs follow Supabase project defaults (`expiresIn` from the session response). |

Store after login: `accessToken`, `refreshToken`, `userId`, `lane`, `roleCode`.

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

- **202** `{ "status": "OTP_SENT", "isNewUser": true | false }`
  - `isNewUser: true` — no live app account for this email yet; client should collect `lane` (and optional `name`) before verify
  - `isNewUser: false` — returning user; omit `lane` on verify
- **422** `VALIDATION_ERROR` / `EMAIL_ADDRESS_INVALID`
- **429** `AUTH_RATE_LIMITED` · **502** `OTP_DELIVERY_FAILED`

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

- `token`: digits only, length matches project OTP setting (currently **6**) · `lane`: required on **first** provision, optional on returning sign-in · `name`: optional (1–120)
- Paste the **full** code from the email (subject + body show `{{ .Token }}`). Partial codes fail as `OTP_EXPIRED`.
- **200**
  ```json
  {
    "session": { "accessToken": "…", "refreshToken": "…", "expiresIn": 3600 },
    "user": {
      "id": "uuid",
      "email": "member@example.com",
      "name": "Member",
      "lane": "CLIENT",
      "roleCode": "CLIENT",
      "staffCode": null,
      "emailVerifiedAt": "2026-08-02T00:00:00.000Z"
    }
  }
  ```
- STAFF first login: `roleCode` = `STAFF_UNASSIGNED`, `staffCode` = non-null string
- **422** `OTP_EXPIRED` (wrong **or** expired — GoTrue uses one code for both) / `VALIDATION_ERROR` / `EMAIL_NOT_VERIFIED` / `LANE_REQUIRED` (first provision without `lane`)
- **409** `LANE_MISMATCH` (same email already provisioned on the other lane)

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

`POST /auth/google/complete` — Bearer (identity)

- **200** `{ "user": { …same shape as OTP… } }`
- **401** `AUTHENTICATION_FAILED`
- **422** `GOOGLE_IDENTITY_REQUIRED` / `EMAIL_NOT_VERIFIED` / `VALIDATION_ERROR`
- **409** `LANE_MISMATCH`

---

## Session

### Refresh access token

`POST /auth/refresh` — public (body carries the refresh token)

```json
{ "refreshToken": "…" }
```

- **200**
  ```json
  {
    "session": {
      "accessToken": "…",
      "refreshToken": "…",
      "expiresIn": 3600
    }
  }
  ```
- Always persist the **new** `refreshToken` (rotation invalidates the previous one).
- **401** `AUTHENTICATION_FAILED` — invalid, expired, or already-rotated refresh token
- **422** `VALIDATION_ERROR`

### Current user

`GET /auth/me` — Bearer (provisioned user)

- **200** `{ "user": { id, email, name, lane, roleCode, staffCode, emailVerifiedAt } }`
- **401** `AUTHENTICATION_FAILED` — missing/invalid token, or identity exists but app user not provisioned yet

Call after cold start to restore UI from a stored token. On `401` from a protected call, try `/auth/refresh` once; if that fails, send the user through OTP/Google again.

---

## Gym orgs (STAFF after login)

Requires Bearer. Create only if `roleCode` is `STAFF_UNASSIGNED` or `ADMIN`.

`POST /gym-orgs`

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

- **201** `{ "gymOrg": { id, name, …, ownerUserId, createdAt, updatedAt } }`
- **403** `GYM_ORG_CREATION_FORBIDDEN` (e.g. CLIENT lane)

`GET /gym-orgs` → **200** `{ "gymOrgs": [{ id, name, timezone, isOwner }] }` (admin **or** trainer affiliations; may be `[]`)

`GET /gym-orgs/:gymOrgId` → detail for affiliated staff (`isOwner` included)

`PATCH /gym-orgs/:gymOrgId` — Admin at that gym only; body same shape as create (name + optionals + timezone)

- **200** `{ "gymOrg": { … } }`
- **403** `GYM_ORG_WRITE_FORBIDDEN`

### Staff invites (in-app; `staff_code` / QR — not email tokens)

Admin at the gym:

- `POST /gym-orgs/:gymOrgId/staff-invites` `{ "staffCode", "targetRole": "TRAINER"|"ADMIN", "expiresAt"? }` → **201** `{ "staffInvite" }` (default expiry 14 days; max **3** admins including owner + pending ADMIN invites)
- `GET /gym-orgs/:gymOrgId/staff-invites?limit&offset` → paginated list
- `POST /gym-orgs/staff-invites/:inviteId/revoke` → revoke pending

Invitee (STAFF):

- `GET /gym-orgs/staff-invites/inbox?limit&offset` — pending/other invites; past `expiresAt` show as `EXPIRED` without a write
- `POST /gym-orgs/staff-invites/:inviteId/accept` → affiliations + role upgrade (`TRAINER` or desk `ADMIN`; Admin-as-Trainer gets a trainer profile too)

Useful errors: `STAFF_INVITE_FORBIDDEN`, `INVALID_STAFF_INVITEE`, `STAFF_ALREADY_AFFILIATED`, `STAFF_INVITE_ADMIN_CAP`, `STAFF_INVITE_EXPIRED`

---

## Client UX checklist

1. **No “Sign up” vs “Log in”** — one auth path; first success creates the account.
2. Ask for **lane** only when OTP request returns `isNewUser: true` (or hard-code lane in CLIENT vs STAFF apps). Omit lane on returning verify.
3. On `LANE_MISMATCH`, tell the user this email belongs to the other account type.
4. On `OTP_EXPIRED`, send them back to request a new code.
5. On API `401`, try `POST /auth/refresh` once with the stored refresh token; replace both tokens on success; re-login if refresh fails.
6. Treat any non-2xx as `{ error.code }` — branch UI on `code`, show `message` as fallback.
7. Prefer Postman **Examples** on each request when generating clients.
