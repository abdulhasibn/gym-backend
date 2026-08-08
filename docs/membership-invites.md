# Membership invites + DataGrants

Brief guide for Admin/Client apps (and AI agents) integrating join + consent APIs.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) → folder **Membership Invites** (request docs + Examples)

Join is **Admin invite only** — no open gym codes. Accept creates an ACTIVE membership (+ subscription snapshots). DataGrants gate staff visibility of Client-owned profile/class data ([ADR-0002](adr/0002-client-owned-records-and-data-grants.md)).

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` |
| Auth | `Authorization: Bearer <accessToken>` |
| Errors | `{ "error": { "code": string, "message": string } }` |
| Vars | `gymOrgId`, `planId` (BASE), `membershipInviteId`, `membershipId` |

**Statuses:** `PENDING` · `ACCEPTED` · `REVOKED` · `EXPIRED` (EXPIRED may be computed when listing past `expiresAt`)  
**Payment:** `paid` · `unpaid` · `partial`  
**Required grants (always on accept):** `DOB`, `HEIGHT`, `WEIGHT`  
**Optional profile:** `GENDER`, `MEDICAL_NOTES`  
**Class grants:** `PROGRESS`, `CALORIES`, `WEARABLES`, `DIET_PLANS`, `WORKOUT_PLANS`

---

## Happy path

```
Admin (STAFF)                         Client (CLIENT)
─────────────                         ───────────────
Create BASE plan → planId
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

- `inviteeName`, `invitedEmail`, `basePlanId`, `basePaymentStatus` required  
- `inviteePhone`, `expiresAt` optional (default expiry **+14 days**)  
- Addon fields must be **both set or both omitted**; addon must be active `TRAINER_COACHING` ADDON  
- Cannot invite a **STAFF** email (`INVALID_MEMBERSHIP_INVITEE`)

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

| Status | Codes |
|--------|--------|
| 401 | `AUTHENTICATION_FAILED` |
| 403 | `PLAN_FORBIDDEN` |
| 409 | `CONFLICT` (e.g. expiry in the past; unique pending email at gym) |
| 422 | `INVALID_INVITE_PLAN` · `INVALID_MEMBERSHIP_INVITEE` · `VALIDATION_ERROR` |

Minimal body (no addon / phone / expiry):

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

Errors: `401`; `403` `PLAN_FORBIDDEN`.

---

## Admin — revoke

`POST /gym-orgs/:gymOrgId/membership-invites/:inviteId/revoke` — Bearer ADMIN  
Body: none. Only `PENDING` → `REVOKED`.

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

| Status | Codes |
|--------|--------|
| 403 | `MEMBERSHIP_INVITE_FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `MEMBERSHIP_INVITE_EXPIRED` · `ACTIVE_MEMBERSHIP_CONFLICT` · `MEMBERSHIP_INVITE_INVALID_TRANSITION` |
| 422 | `VALIDATION_ERROR` |

---

## Client — get DataGrants

`GET /gym-orgs/:gymOrgId/my-data-grants` — Bearer CLIENT with **ACTIVE** membership at gym

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

**200** `{ "dataGrants": { …, "profileAttributes": ["DOB","HEIGHT","WEIGHT","MEDICAL_NOTES"], "classGrants": ["PROGRESS","CALORIES"] } }`

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

Common codes: `AUTHENTICATION_FAILED` · `PLAN_FORBIDDEN` · `MEMBERSHIP_INVITE_FORBIDDEN` · `DATA_GRANT_FORBIDDEN` · `INVALID_INVITE_PLAN` · `INVALID_MEMBERSHIP_INVITEE` · `MEMBERSHIP_INVITE_EXPIRED` · `ACTIVE_MEMBERSHIP_CONFLICT` · `MEMBERSHIP_INVITE_INVALID_TRANSITION` · `NOT_FOUND` · `CONFLICT` · `VALIDATION_ERROR`.

---

## Not in this slice

- Admin subscription manage (payment/start override / later addon) — Phase 4  
- Roster / offboard / block — Phase 5  
- Invite email/push delivery; writing vitals into `client_profiles`  
- Lead convert → prefilled invite (A14)
