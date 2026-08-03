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
| Lane | `CLIENT` or `STAFF` — chosen on first provision; cannot change later (`LANE_MISMATCH`) |

Store after login: `accessToken`, `refreshToken` (OTP only), `userId`, `lane`, `roleCode`.

---

## Email OTP (primary)

```
1. Collect email (+ lane + optional name on the verify screen)
2. POST /auth/otp/request   { email }
3. User enters code from email
4. POST /auth/otp/verify    { email, token, lane, name? }
5. Persist session.accessToken (+ refreshToken, expiresIn)
6. Use Bearer token for /auth/me, /gym-orgs, …
```

### Request OTP

`POST /auth/otp/request` — public

```json
{ "email": "member@example.com" }
```

- **202** `{ "status": "OTP_SENT" }`
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

- `token`: digits only, length matches project OTP setting (currently **6**) · `lane`: required · `name`: optional (1–120)
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
- **422** `OTP_EXPIRED` (wrong **or** expired — GoTrue uses one code for both) / `VALIDATION_ERROR` / `EMAIL_NOT_VERIFIED`
- **409** `LANE_MISMATCH` (same email already provisioned on the other lane)

**Postman tip:** set env `email` to the inbox you read, run Request OTP once, paste the full code into `otpToken`, then Verify. Re-requesting invalidates the previous code. Wait ~60s between requests if you hit `AUTH_RATE_LIMITED`.

---

## Google (optional)

```
1. Open GET /auth/google/start in a browser / in-app browser (302 → Supabase Google)
2. After consent, capture access_token from the callback URL hash
3. POST /auth/google/complete  with Bearer that token
4. Body: { lane, name? }  →  { user }  (tokens are NOT rotated — keep the Google session token)
```

`POST /auth/google/complete` — Bearer (identity)

- **200** `{ "user": { …same shape as OTP… } }`
- **401** `AUTHENTICATION_FAILED`
- **422** `GOOGLE_IDENTITY_REQUIRED` / `EMAIL_NOT_VERIFIED` / `VALIDATION_ERROR`
- **409** `LANE_MISMATCH`

---

## Session

`GET /auth/me` — Bearer (provisioned user)

- **200** `{ "user": { id, email, name, lane, roleCode, staffCode, emailVerifiedAt } }`
- **401** `AUTHENTICATION_FAILED` — missing/invalid token, or identity exists but app user not provisioned yet

Call after cold start to restore UI from a stored token.

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

`GET /gym-orgs` → **200** `{ "gymOrgs": [{ id, name, timezone, isOwner }] }` (may be `[]`)

---

## Client UX checklist

1. **No “Sign up” vs “Log in”** — one auth path; first success creates the account.
2. Ask for **lane** before verify/complete (CLIENT app vs STAFF/admin app may hard-code it).
3. On `LANE_MISMATCH`, tell the user this email belongs to the other account type.
4. On `OTP_EXPIRED`, send them back to request a new code.
5. Treat any non-2xx as `{ error.code }` — branch UI on `code`, show `message` as fallback.
6. Prefer Postman **Examples** on each request when generating clients.
