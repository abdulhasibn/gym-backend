# Mini-CRM leads (Admin)

Guide for Admin apps (and AI agents) capturing and managing gym leads.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) → folder **Leads**  
**Auth:** [`client-auth.md`](client-auth.md) · **Plans:** [`plans.md`](plans.md) · **Membership invites:** [`membership-invites.md`](membership-invites.md)  
**Status:** A11–A14 shipped (convert → membership invite). Push/inbox follow-up delivery is Stint 3.5 ([`MVP_ROADMAP.md`](MVP_ROADMAP.md) · [`PROGRESS.md`](PROGRESS.md))

All routes require Bearer **ADMIN** at `:gymOrgId` (lead policy). Soft-delete hides a lead from lists.

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` |
| Auth | `Authorization: Bearer <accessToken>` (ADMIN at gym) |
| Errors | `{ "error": { "code": string, "message": string } }` |
| Pagination | `limit` default **20**, max **100**; `offset` default **0**. Page: `{ items, total, limit, offset }` |
| Dates | Follow-up dates are calendar `YYYY-MM-DD` (not full timestamps) |

**Statuses:** `NEW` · `CONTACTED` · `TRIAL` · `CONVERTED` · `LOST`  
**Open statuses** (dup-phone warn + due list): `NEW` · `CONTACTED` · `TRIAL`

### Shared response shape — `lead`

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | Lead id | `"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"` |
| `gymOrgId` | string (uuid) | Owning gym | `"33333333-3333-4333-8333-333333333333"` |
| `name` | string | Prospect name, 1–255 | `"Priya Walk-in"` |
| `phone` | string | Contact phone, 1–32 | `"9876543210"` |
| `email` | string \| null | Prospect email, max 255, stored lowercase. Optional at capture; required to convert | `"priya@gym.test"` or `null` |
| `source` | string \| null | How they found the gym, max 255 | `"Instagram"` or `null` |
| `status` | enum | Pipeline stage | `NEW` \| `CONTACTED` \| `TRIAL` \| `CONVERTED` \| `LOST` |
| `interest` | string \| null | Free-text what they want (trial, PT, etc.), max 2000 | `"Personal training trial"` or `null` |
| `notes` | string \| null | Staff notes, max 5000 | `"Asked about evening slots"` or `null` |
| `followUpDate` | string \| null | Next follow-up day `YYYY-MM-DD` | `"2026-08-15"` or `null` |
| `convertedMembershipInviteId` | string \| null | Invite created by convert (A14), else `null` | `"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"` or `null` |
| `createdBy` | string (uuid) | Admin who created | `"cccccccc-cccc-4ccc-8ccc-cccccccccccc"` |
| `createdAt` | string (ISO) | Created at | `"2026-08-08T12:00:00.000Z"` |
| `updatedAt` | string (ISO) | Updated at | `"2026-08-08T12:00:00.000Z"` |

### Soft warning — `warnings[]`

Returned on create/update when another **open** lead at the same gym shares the phone. Does **not** block the write.

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `code` | enum | Warning code | `DUPLICATE_OPEN_LEAD_PHONE` |
| `existingLeadIds` | string[] | Other open lead ids with the same phone | `["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"]` |

---

## Happy path

```
Admin creates lead (NEW) — email optional
  → PATCH profile / follow-up date / email
  → PATCH status NEW → CONTACTED → TRIAL → CONVERTED | LOST
  → POST convert → PENDING membership invite (name/phone from lead; email from lead or body)
  → GET due-follow-ups for today’s inbox
```

---

## Create lead

`POST /gym-orgs/:gymOrgId/leads` — Bearer ADMIN

```json
{
  "name": "Priya Walk-in",
  "phone": "9876543210",
  "email": "priya@gym.test",
  "source": "Instagram",
  "interest": "Personal training trial",
  "notes": "Asked about evening slots"
}
```

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym owning the lead | `"33333333-3333-4333-8333-333333333333"` |

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `name` | yes | string | Prospect name, 1–255 after trim | `"Priya Walk-in"` |
| `phone` | yes | string | Contact phone, 1–32 after trim | `"9876543210"` |
| `email` | no | string \| null | Prospect email, max 255; stored lowercase. Omit or `null` for walk-ins | `"priya@gym.test"` or `null` |
| `source` | no | string \| null | Acquisition source, max 255 | `"Instagram"` or `null` |
| `interest` | no | string \| null | What the prospect wants (free text), max 2000 | `"Personal training trial"` or `null` |
| `notes` | no | string \| null | Internal notes, max 5000 | `"Asked about evening slots"` or `null` |

New leads start at status `NEW`. `followUpDate` is set via update.

**201**

```json
{
  "lead": {
    "id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    "gymOrgId": "33333333-3333-4333-8333-333333333333",
    "name": "Priya Walk-in",
    "phone": "9876543210",
    "email": "priya@gym.test",
    "source": "Instagram",
    "status": "NEW",
    "interest": "Personal training trial",
    "notes": "Asked about evening slots",
    "followUpDate": null,
    "convertedMembershipInviteId": null,
    "createdBy": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "createdAt": "2026-08-08T12:00:00.000Z",
    "updatedAt": "2026-08-08T12:00:00.000Z"
  },
  "warnings": []
}
```

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `lead` | object | Created lead | see [lead](#shared-response-shape--lead) |
| `warnings` | object[] | Soft warnings (may be empty) | see [warnings](#soft-warning--warnings) |

Errors: **401** · **403** · **422** `VALIDATION_ERROR`

---

## List leads

`GET /gym-orgs/:gymOrgId/leads?limit=20&offset=0&status=NEW` — Bearer ADMIN

**Path params:** `gymOrgId` (uuid)

**Query params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `limit` | no | integer | Page size, 1–100, default 20 | `20` |
| `offset` | no | integer | Skip count, default 0 | `0` |
| `status` | no | enum | Filter by pipeline status | `NEW` \| `CONTACTED` \| `TRIAL` \| `CONVERTED` \| `LOST` |

**200**

```json
{
  "leads": {
    "items": [ /* lead */ ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Due follow-ups

`GET /gym-orgs/:gymOrgId/leads/due-follow-ups?limit=20&offset=0&onOrBefore=2026-08-15` — Bearer ADMIN

Returns open leads whose `followUpDate` is on or before the given day (default: today UTC).

**Path params:** `gymOrgId` (uuid)

**Query params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `limit` | no | integer | Page size, 1–100, default 20 | `20` |
| `offset` | no | integer | Skip count, default 0 | `0` |
| `onOrBefore` | no | string (`YYYY-MM-DD`) | Inclusive due date; defaults to today UTC | `"2026-08-15"` |

**200** `{ "leads": { "items": [ /* lead */ ], "total", "limit", "offset" } }`

---

## Get lead

`GET /gym-orgs/:gymOrgId/leads/:leadId` — Bearer ADMIN

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym | `"33333333-3333-4333-8333-333333333333"` |
| `leadId` | yes | string (uuid) | Lead | `"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"` |

**200** `{ "lead": { … } }`

Errors: **404** `NOT_FOUND`

---

## Update lead

`PATCH /gym-orgs/:gymOrgId/leads/:leadId` — Bearer ADMIN

```json
{
  "name": "Priya Walk-in",
  "phone": "9876543210",
  "email": "priya@gym.test",
  "source": "Walk-in",
  "interest": "Personal training trial",
  "notes": "Prefers 7pm",
  "followUpDate": "2026-08-15"
}
```

**Path params:** `gymOrgId`, `leadId` (uuids)

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `name` | yes | string | Prospect name, 1–255 | `"Priya Walk-in"` |
| `phone` | yes | string | Contact phone, 1–32 | `"9876543210"` |
| `email` | no | string \| null | Prospect email, max 255. Omit to keep; `null` clears | `"priya@gym.test"` or `null` |
| `source` | no | string \| null | Acquisition source, max 255 | `"Walk-in"` or `null` |
| `interest` | no | string \| null | Free-text interest, max 2000 | `"Personal training trial"` or `null` |
| `notes` | no | string \| null | Staff notes, max 5000 | `"Prefers 7pm"` or `null` |
| `followUpDate` | no | string \| null | Next follow-up `YYYY-MM-DD`, or `null` to clear. If the key is omitted, existing date is left unchanged | `"2026-08-15"` or `null` |

**200** `{ "lead": { … }, "warnings": [ … ] }` — same shape as create.

Errors: **404** · **422** `VALIDATION_ERROR`

---

## Change lead status

`PATCH /gym-orgs/:gymOrgId/leads/:leadId/status` — Bearer ADMIN

```json
{ "status": "CONTACTED" }
```

**Path params:** `gymOrgId`, `leadId` (uuids)

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `status` | yes | enum | New pipeline status | `NEW` \| `CONTACTED` \| `TRIAL` \| `CONVERTED` \| `LOST` |

**200** `{ "lead": { …, "status": "CONTACTED" } }`

Setting `CONVERTED` here does **not** create an invite. Use [Convert](#convert-lead--membership-invite) for A14.

Errors: **404** · **422** `VALIDATION_ERROR`

---

## Convert lead → membership invite

`POST /gym-orgs/:gymOrgId/leads/:leadId/convert` — Bearer ADMIN

Creates a **PENDING** membership invite pre-filled from the lead (name + phone). Email is `invitedEmail` if sent, otherwise the lead’s stored email. Membership still requires the Client to accept.

```json
{
  "invitedEmail": "priya@gym.test",
  "basePlanId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "basePaymentStatus": "paid",
  "addonPlanId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "addonPaymentStatus": "unpaid"
}
```

**Path params:** `gymOrgId`, `leadId` (uuids)

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `invitedEmail` | no | string | Invite email. Required when the lead has no email. If both are set, **body wins** and is written onto the lead | `"priya@gym.test"` |
| `basePlanId` | yes | string (uuid) | Active BASE plan at this gym | `"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"` |
| `basePaymentStatus` | yes | enum | Payment on the base line | `paid` \| `unpaid` \| `partial` |
| `addonPlanId` | no | string (uuid) | Active `TRAINER_COACHING` ADDON; must pair with `addonPaymentStatus` | `"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"` |
| `addonPaymentStatus` | no | enum | Payment on the addon line | `paid` \| `unpaid` \| `partial` |
| `expiresAt` | no | string (ISO) | Invite expiry; default 14 days | `"2026-08-22T00:00:00.000Z"` |

**201** `{ "lead": { …, "status": "CONVERTED", "convertedMembershipInviteId": "…" }, "membershipInvite": { … } }`

`membershipInvite` matches [create invite](membership-invites.md#create-invite).

Errors: **401** · **403** · **404** · **409** `LEAD_ALREADY_CONVERTED` / `LEAD_NOT_CONVERTIBLE` (LOST — re-inquiry is a new lead row) · **422** `LEAD_EMAIL_REQUIRED` / `INVALID_INVITE_PLAN` / `INVALID_MEMBERSHIP_INVITEE` / `VALIDATION_ERROR`

---

## Soft-delete lead

`DELETE /gym-orgs/:gymOrgId/leads/:leadId` — Bearer ADMIN  
Body: none. Soft-deletes the lead (`deleted_at` set); excluded from subsequent lists.

**Path params:** `gymOrgId`, `leadId` (uuids)

**204** empty body

Errors: **403** · **404** `NOT_FOUND`

---

## Not in this slice

- Push / inbox reminders for follow-ups (M12 / Stint 3.5)
