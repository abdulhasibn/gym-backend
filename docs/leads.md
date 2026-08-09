# Mini-CRM leads (Admin)

Guide for Admin apps (and AI agents) capturing and managing gym leads.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) → folder **Leads**  
**Auth:** [`client-auth.md`](client-auth.md) · **Plans:** [`plans.md`](plans.md) · **Membership invites:** [`membership-invites.md`](membership-invites.md)  
**Status:** A11–A13 shipped; A14 convert → invite deferred ([`MVP_ROADMAP.md`](MVP_ROADMAP.md) · [`PROGRESS.md`](PROGRESS.md))

All routes require Bearer **ADMIN** at `:gymOrgId` (lead policy). Soft-delete hides a lead from lists; convert-to-invite is not in this slice.

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
| `source` | string \| null | How they found the gym, max 255 | `"Instagram"` or `null` |
| `status` | enum | Pipeline stage | `NEW` \| `CONTACTED` \| `TRIAL` \| `CONVERTED` \| `LOST` |
| `interest` | string \| null | Free-text what they want (trial, PT, etc.), max 2000 | `"Personal training trial"` or `null` |
| `notes` | string \| null | Staff notes, max 5000 | `"Asked about evening slots"` or `null` |
| `followUpDate` | string \| null | Next follow-up day `YYYY-MM-DD` | `"2026-08-15"` or `null` |
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
Admin creates lead (NEW)
  → PATCH profile / follow-up date
  → PATCH status NEW → CONTACTED → TRIAL → CONVERTED | LOST
  → GET due-follow-ups for today’s inbox
(Convert → membership invite = A14, not shipped)
```

---

## Create lead

`POST /gym-orgs/:gymOrgId/leads` — Bearer ADMIN

```json
{
  "name": "Priya Walk-in",
  "phone": "9876543210",
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
    "source": "Instagram",
    "status": "NEW",
    "interest": "Personal training trial",
    "notes": "Asked about evening slots",
    "followUpDate": null,
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

Errors: **404** · **422** `VALIDATION_ERROR`

---

## Soft-delete lead

`DELETE /gym-orgs/:gymOrgId/leads/:leadId` — Bearer ADMIN  
Body: none. Soft-deletes the lead (`deleted_at` set); excluded from subsequent lists.

**Path params:** `gymOrgId`, `leadId` (uuids)

**204** empty body

Errors: **403** · **404** `NOT_FOUND`

---

## Not in this slice

- Convert lead → prefilled membership invite (A14)  
- Push / inbox reminders for follow-ups (M12)
