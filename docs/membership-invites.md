# Membership invites + DataGrants

Brief guide for Admin/Client apps (and AI agents) integrating join + consent APIs.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) → folder **Membership Invites** (request docs + Examples)  
**Auth / CLIENT surface map:** [`client-auth.md`](client-auth.md) · **Plans (prereq):** [`plans.md`](plans.md) · **Leads:** [`leads.md`](leads.md)  
**Status:** Stint 1.1–1.4 shipped (this guide). Subscriptions: [`subscriptions.md`](subscriptions.md). Roster: [`roster.md`](roster.md). ([`MVP_ROADMAP.md`](MVP_ROADMAP.md) · [`PROGRESS.md`](PROGRESS.md))

Join is **Admin invite only** — no open gym codes. Accept creates an ACTIVE membership (+ subscription snapshots). DataGrants gate staff visibility of Client-owned profile/class data ([ADR-0002](adr/0002-client-owned-records-and-data-grants.md)).

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` |
| Auth | `Authorization: Bearer <accessToken>` |
| Errors | `{ "error": { "code": string, "message": string } }` |
| Vars | `gymOrgId`, `planId` (BASE), `membershipInviteId`, `membershipId` |
| Pagination | `limit` default **20**, max **100**; `offset` default **0**. Page: `{ items, total, limit, offset }` |

**Invite statuses:** `PENDING` · `ACCEPTED` · `REVOKED` · `EXPIRED` (EXPIRED may be computed when listing past `expiresAt`)  
**Payment:** `paid` · `unpaid` · `partial`  
**Required grants (always on accept):** `DOB`, `HEIGHT`, `WEIGHT`  
**Optional profile (request body):** `GENDER`, `MEDICAL_NOTES`  
**Class grants:** `PROGRESS`, `CALORIES`, `WEARABLES`, `DIET_PLANS`, `WORKOUT_PLANS`

### Shared response shapes

**`membershipInvite`**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | Invite id | `"11111111-1111-4111-8111-111111111111"` |
| `gymOrgId` | string (uuid) | Issuing gym | `"33333333-3333-4333-8333-333333333333"` |
| `invitedEmail` | string | Invite match key (lowercase) | `"alex.client@example.com"` |
| `invitedUserId` | string (uuid) \| null | Resolved CLIENT user if already provisioned | `"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"` or `null` |
| `inviteeName` | string | Display name on invite | `"Alex Client"` |
| `inviteePhone` | string \| null | Optional contact phone | `"+15551234567"` or `null` |
| `basePlanId` | string (uuid) | Active BASE plan snapshotted on accept | `"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"` |
| `basePaymentStatus` | enum | Payment state for base line | `paid` \| `unpaid` \| `partial` |
| `addonPlanId` | string (uuid) \| null | Optional ADDON plan | uuid or `null` |
| `addonPaymentStatus` | enum \| null | Payment for addon; null if no addon | `paid` \| `unpaid` \| `partial` \| `null` |
| `status` | enum | Invite lifecycle | `PENDING` \| `ACCEPTED` \| `REVOKED` \| `EXPIRED` |
| `expiresAt` | string (ISO) \| null | Expiry | `"2026-08-22T00:00:00.000Z"` |
| `createdBy` | string (uuid) | Admin who created | `"cccccccc-cccc-4ccc-8ccc-cccccccccccc"` |
| `acceptedAt` | string (ISO) \| null | When accepted | `null` until accept |
| `acceptedMembershipId` | string (uuid) \| null | Membership created on accept | `null` until accept |
| `createdAt` | string (ISO) | Created at | `"2026-08-08T12:00:00.000Z"` |
| `updatedAt` | string (ISO) | Updated at | `"2026-08-08T12:00:00.000Z"` |

**`dataGrants`**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `gymOrgId` | string (uuid) | Gym scope | `"33333333-3333-4333-8333-333333333333"` |
| `clientUserId` | string (uuid) | Client who owns the grants | `"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"` |
| `profileAttributes` | string[] | Granted profile attrs (always includes required) | `["DOB","HEIGHT","WEIGHT","GENDER"]` — members: `DOB` \| `HEIGHT` \| `WEIGHT` \| `GENDER` \| `MEDICAL_NOTES` |
| `classGrants` | string[] | Granted data classes | `["PROGRESS"]` — members: `PROGRESS` \| `CALORIES` \| `WEARABLES` \| `DIET_PLANS` \| `WORKOUT_PLANS` |

---

## Happy path

```
Admin (STAFF)                         Client (CLIENT)
─────────────                         ───────────────
Create BASE plan → planId             (see plans.md)
POST …/membership-invites  ─────────► GET /membership-invites/inbox
(stores membershipInviteId)           POST …/:id/accept
                                      (stores membershipId)
                                      GET/PUT …/my-data-grants
```

Prereqs: Admin has gym + BASE plan; invitee uses a **CLIENT** account with the **same email** as `invitedEmail` (or email not yet provisioned — invite still creates; inbox matches after they sign up with that email).

---

## Admin — create invite

`POST /gym-orgs/:gymOrgId/membership-invites` — Bearer ADMIN at gym

```json
{
  "inviteeName": "Alex Client",
  "invitedEmail": "alex.client@example.com",
  "inviteePhone": "+15551234567",
  "basePlanId": "{{planId}}",
  "basePaymentStatus": "unpaid",
  "addonPlanId": "{{addonPlanId}}",
  "addonPaymentStatus": "paid",
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
| `inviteeName` | yes | string | Invitee display name, 1–255 after trim | `"Alex Client"` |
| `invitedEmail` | yes | string | Email used to match CLIENT inbox (normalized lowercase) | `"alex.client@example.com"` |
| `inviteePhone` | no | string | Contact phone, 1–32 after trim | `"+15551234567"` |
| `basePlanId` | yes | string (uuid) | Active **BASE** plan at this gym | `"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"` |
| `basePaymentStatus` | yes | enum | Payment state for the base subscription line | `paid` \| `unpaid` \| `partial` |
| `addonPlanId` | no* | string (uuid) | Active `TRAINER_COACHING` **ADDON**; must pair with `addonPaymentStatus` | uuid of addon plan |
| `addonPaymentStatus` | no* | enum | Payment for addon line; must pair with `addonPlanId` | `paid` \| `unpaid` \| `partial` |
| `expiresAt` | no | string (ISO date) | Defaults to **+14 days** if omitted | `"2026-08-22T00:00:00.000Z"` |

\* Addon fields must be **both set or both omitted**.

Constraints: Cannot invite a **STAFF** email (`INVALID_MEMBERSHIP_INVITEE`).

**201**

```json
{
  "membershipInvite": {
    "id": "11111111-1111-4111-8111-111111111111",
    "gymOrgId": "33333333-3333-4333-8333-333333333333",
    "invitedEmail": "alex.client@example.com",
    "invitedUserId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "inviteeName": "Alex Client",
    "inviteePhone": "+15551234567",
    "basePlanId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "basePaymentStatus": "unpaid",
    "addonPlanId": null,
    "addonPaymentStatus": null,
    "status": "PENDING",
    "expiresAt": "2026-08-22T00:00:00.000Z",
    "createdBy": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "acceptedAt": null,
    "acceptedMembershipId": null,
    "createdAt": "2026-08-08T12:00:00.000Z",
    "updatedAt": "2026-08-08T12:00:00.000Z"
  }
}
```

Response: `{ "membershipInvite": … }` — see [membershipInvite](#shared-response-shapes).

| Status | Codes |
|--------|--------|
| 401 | `AUTHENTICATION_FAILED` |
| 403 | `PLAN_FORBIDDEN` |
| 409 | `CONFLICT` (e.g. expiry in the past; unique pending email at gym) |
| 422 | `INVALID_INVITE_PLAN` · `INVALID_MEMBERSHIP_INVITEE` · `VALIDATION_ERROR` |

Minimal body (no addon / phone / expiry) — same field table; omit optional keys:

```json
{
  "inviteeName": "Alex Client",
  "invitedEmail": "alex.client@example.com",
  "basePlanId": "{{planId}}",
  "basePaymentStatus": "unpaid"
}
```

---

## Admin — list invites

`GET /gym-orgs/:gymOrgId/membership-invites?limit=20&offset=0` — Bearer ADMIN

**Path params:** `gymOrgId` (uuid)

**Query params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `limit` | no | integer | Page size, 1–100, default 20 | `20` |
| `offset` | no | integer | Skip count, default 0 | `0` |

**200**

```json
{
  "membershipInvites": {
    "items": [{ "id": "…", "status": "PENDING", "invitedEmail": "alex.client@example.com" }],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

`items[]` elements are full [membershipInvite](#shared-response-shapes) objects.  
Page wrapper: `items`, `total`, `limit`, `offset`.

Errors: `401`; `403` `PLAN_FORBIDDEN`.

---

## Admin — revoke

`POST /gym-orgs/:gymOrgId/membership-invites/:inviteId/revoke` — Bearer ADMIN  
Body: none. Only `PENDING` → `REVOKED`.

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym | `"33333333-3333-4333-8333-333333333333"` |
| `inviteId` | yes | string (uuid) | Invite to revoke | `"11111111-1111-4111-8111-111111111111"` |

**200** `{ "membershipInvite": { …, "status": "REVOKED" } }`

| Status | Codes |
|--------|--------|
| 403 | `PLAN_FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `MEMBERSHIP_INVITE_INVALID_TRANSITION` |

---

## Client — inbox

`GET /membership-invites/inbox?limit=20&offset=0` — Bearer CLIENT

Matches invites by `invited_user_id` or pending email. Each item embeds gym profile.

**Query params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `limit` | no | integer | Page size, 1–100, default 20 | `20` |
| `offset` | no | integer | Skip count, default 0 | `0` |

**200**

```json
{
  "membershipInvites": {
    "items": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "gymOrgId": "33333333-3333-4333-8333-333333333333",
        "invitedEmail": "alex.client@example.com",
        "status": "PENDING",
        "basePlanId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "basePaymentStatus": "unpaid",
        "gym": {
          "id": "33333333-3333-4333-8333-333333333333",
          "name": "Iron Temple",
          "address": "12 Lift St",
          "contactPhone": "+15550001111",
          "contactEmail": "desk@irontemple.example",
          "logoUrl": null,
          "timezone": "Asia/Kolkata"
        }
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

**Inbox item** = [membershipInvite](#shared-response-shapes) + nested `gym`:

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `gym.id` | string (uuid) | Gym id | `"33333333-3333-4333-8333-333333333333"` |
| `gym.name` | string | Gym name | `"Iron Temple"` |
| `gym.address` | string \| null | Address | `"12 Lift St"` |
| `gym.contactPhone` | string \| null | Phone | `"+15550001111"` |
| `gym.contactEmail` | string \| null | Email | `"desk@irontemple.example"` |
| `gym.logoUrl` | string \| null | Logo URL | `null` |
| `gym.timezone` | string (IANA) | Timezone | `"Asia/Kolkata"` |

Errors: `401`; `403` `MEMBERSHIP_INVITE_FORBIDDEN` (non-CLIENT).

---

## Client — accept

`POST /membership-invites/:inviteId/accept` — Bearer CLIENT matching invite

Atomic: ACTIVE `client_memberships` + base (± addon) subscription snapshots + required DOB/HEIGHT/WEIGHT + optional checklist. **One ACTIVE membership per client** across gyms.

```json
{
  "optionalProfileAttributes": ["GENDER"],
  "optionalClassGrants": ["PROGRESS"]
}
```

Omit or send `{}` / empty arrays for required-only grants.

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `inviteId` | yes | string (uuid) | Pending invite from inbox | `"11111111-1111-4111-8111-111111111111"` |

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `optionalProfileAttributes` | no | string[] | Extra profile attrs to grant (default `[]`). Required `DOB`/`HEIGHT`/`WEIGHT` are applied server-side and are **not** sent here | `["GENDER"]` — allowed: `GENDER` \| `MEDICAL_NOTES` |
| `optionalClassGrants` | no | string[] | Class grants to enable (default `[]`) | `["PROGRESS"]` — allowed: `PROGRESS` \| `CALORIES` \| `WEARABLES` \| `DIET_PLANS` \| `WORKOUT_PLANS` |

**200**

```json
{
  "membershipInvite": {
    "id": "11111111-1111-4111-8111-111111111111",
    "status": "ACCEPTED",
    "acceptedAt": "2026-08-08T12:05:00.000Z",
    "acceptedMembershipId": "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
  },
  "membershipId": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "grants": {
    "profileAttributes": ["DOB", "HEIGHT", "WEIGHT", "GENDER"],
    "classGrants": ["PROGRESS"]
  }
}
```

**Response fields**

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `membershipInvite` | object | Updated invite (full [membershipInvite](#shared-response-shapes)) | `status` = `ACCEPTED` |
| `membershipId` | string (uuid) \| null | New ACTIVE membership id | `"dddddddd-dddd-4ddd-8ddd-dddddddddddd"` |
| `grants.profileAttributes` | string[] | Effective profile grants after accept | includes required + selected optionals |
| `grants.classGrants` | string[] | Effective class grants | selected class grants |

| Status | Codes |
|--------|--------|
| 403 | `MEMBERSHIP_INVITE_FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `MEMBERSHIP_INVITE_EXPIRED` · `ACTIVE_MEMBERSHIP_CONFLICT` · `MEMBERSHIP_INVITE_INVALID_TRANSITION` |
| 422 | `VALIDATION_ERROR` |

---

## Client — get DataGrants

`GET /gym-orgs/:gymOrgId/my-data-grants` — Bearer CLIENT with **ACTIVE** membership at gym

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym of the ACTIVE membership | `"33333333-3333-4333-8333-333333333333"` |

**200**

```json
{
  "dataGrants": {
    "gymOrgId": "33333333-3333-4333-8333-333333333333",
    "clientUserId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "profileAttributes": ["DOB", "HEIGHT", "WEIGHT", "GENDER"],
    "classGrants": ["PROGRESS"]
  }
}
```

See [dataGrants](#shared-response-shapes).

Errors: `401`; `403` `DATA_GRANT_FORBIDDEN`; `404` if no ACTIVE membership.

---

## Client — update DataGrants

`PUT /gym-orgs/:gymOrgId/my-data-grants` — Bearer CLIENT with ACTIVE membership

Replaces the **optional** checklist. Required `DOB` / `HEIGHT` / `WEIGHT` stay sticky (cannot revoke).

```json
{
  "optionalProfileAttributes": ["MEDICAL_NOTES"],
  "optionalClassGrants": ["PROGRESS", "CALORIES"]
}
```

**Path params:** `gymOrgId` (uuid) — same as get.

**Request body** — same fields as [accept](#client--accept) (`optionalProfileAttributes`, `optionalClassGrants`).

**200** `{ "dataGrants": { … } }` — see [dataGrants](#shared-response-shapes). Example effective attrs after this body: `["DOB","HEIGHT","WEIGHT","MEDICAL_NOTES"]`, class grants `["PROGRESS","CALORIES"]`.

Errors: same as get + `422` `VALIDATION_ERROR`.

---

## Error envelope

```json
{
  "error": {
    "code": "ACTIVE_MEMBERSHIP_CONFLICT",
    "message": "Client already has an active membership"
  }
}
```

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `error.code` | string | Stable machine code | `"ACTIVE_MEMBERSHIP_CONFLICT"` |
| `error.message` | string | Human-readable fallback | `"Client already has an active membership"` |

Common codes: `AUTHENTICATION_FAILED` · `PLAN_FORBIDDEN` · `MEMBERSHIP_INVITE_FORBIDDEN` · `DATA_GRANT_FORBIDDEN` · `INVALID_INVITE_PLAN` · `INVALID_MEMBERSHIP_INVITEE` · `MEMBERSHIP_INVITE_EXPIRED` · `ACTIVE_MEMBERSHIP_CONFLICT` · `MEMBERSHIP_INVITE_INVALID_TRANSITION` · `NOT_FOUND` · `CONFLICT` · `VALIDATION_ERROR`.

---

## Not in this slice

- Addon attach / renew (A8b) — deferred within 1.5  
- Invite email/push delivery; writing vitals into `client_profiles`  
- Lead convert → prefilled invite (A14)  

Roster / offboard / block: [`roster.md`](roster.md).
