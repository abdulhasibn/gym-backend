# Membership plans (Admin catalog)

Guide for Admin apps (and AI agents) managing the gym’s plan catalog used by membership invites.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Postman:** [gym-backend-postman](https://github.com/abdulhasibn/gym-backend-postman) → folder **Plans**  
**Auth:** [`client-auth.md`](client-auth.md) · **Invites (consumes plans):** [`membership-invites.md`](membership-invites.md) · **Leads:** [`leads.md`](leads.md)  
**Status:** Stint 1 Phase 1 shipped ([`MVP_ROADMAP.md`](MVP_ROADMAP.md) · [`PROGRESS.md`](PROGRESS.md))

All routes require Bearer **ADMIN** at `:gymOrgId`. Create a **BASE** plan before issuing membership invites.

---

## Shared conventions

| Item | Rule |
|------|------|
| Content-Type | `application/json` |
| Auth | `Authorization: Bearer <accessToken>` (ADMIN at gym) |
| Errors | `{ "error": { "code": string, "message": string } }` |
| Pagination | `limit` default **20**, max **100**; `offset` default **0**. Page: `{ items, total, limit, offset }` |

**Kinds:** `BASE` · `ADDON`  
**Capabilities:** `TRAINER_COACHING` (ADDON only) · `null` (BASE only)

### Kind / capability pairing

| `kind` | `capability` |
|--------|--------------|
| `BASE` | must be `null` / omitted |
| `ADDON` | must be `TRAINER_COACHING` |

### Shared response shape — `plan`

| Property | Type | Description | Values / example |
|----------|------|-------------|------------------|
| `id` | string (uuid) | Plan id | `"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"` |
| `gymOrgId` | string (uuid) | Owning gym | `"33333333-3333-4333-8333-333333333333"` |
| `name` | string | Plan name, 1–255 | `"Monthly Base"` |
| `kind` | enum | Plan kind | `BASE` \| `ADDON` |
| `capability` | enum \| null | Capability for ADDON; null for BASE | `TRAINER_COACHING` \| `null` |
| `durationDays` | integer | Duration in days, 1–3650 | `30` |
| `price` | number | Price ≥ 0, at most 2 decimal places | `999` or `2499.5` |
| `active` | boolean | Soft-active flag (inactive plans cannot be used on new invites) | `true` |
| `createdAt` | string (ISO) | Created at | `"2026-08-08T12:00:00.000Z"` |
| `updatedAt` | string (ISO) | Updated at | `"2026-08-08T12:00:00.000Z"` |

---

## Happy path

```
Admin creates gym → POST …/plans (BASE) → planId
                 → optional POST …/plans (ADDON, TRAINER_COACHING)
                 → POST …/membership-invites with basePlanId (± addonPlanId)
```

---

## Create plan

`POST /gym-orgs/:gymOrgId/plans` — Bearer ADMIN

**BASE example**

```json
{
  "name": "Monthly Base",
  "kind": "BASE",
  "capability": null,
  "durationDays": 30,
  "price": 999
}
```

**ADDON example**

```json
{
  "name": "PT Coaching",
  "kind": "ADDON",
  "capability": "TRAINER_COACHING",
  "durationDays": 30,
  "price": 1500
}
```

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym owning the catalog | `"33333333-3333-4333-8333-333333333333"` |

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `name` | yes | string | Plan name, 1–255 after trim | `"Monthly Base"` |
| `kind` | yes | enum | Catalog kind | `BASE` \| `ADDON` |
| `capability` | conditional | enum \| null | Required `TRAINER_COACHING` for ADDON; must be null/omitted for BASE | `TRAINER_COACHING` \| `null` |
| `durationDays` | yes | integer | Days, 1–3650 | `30` |
| `price` | yes | number | Non-negative; ≤ 2 decimal places; max `9999999999.99` | `999` |

**201** `{ "plan": { … } }` — see [plan](#shared-response-shape--plan).

Errors: **401** · **403** `PLAN_FORBIDDEN` · **422** `VALIDATION_ERROR`

---

## List plans

`GET /gym-orgs/:gymOrgId/plans?limit=20&offset=0&kind=BASE&active=true` — Bearer ADMIN

**Path params:** `gymOrgId` (uuid)

**Query params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `limit` | no | integer | Page size, 1–100, default 20 | `20` |
| `offset` | no | integer | Skip count, default 0 | `0` |
| `kind` | no | enum | Filter by kind | `BASE` \| `ADDON` |
| `active` | no | string enum | Filter by active flag (query string booleans) | `"true"` \| `"false"` |

**200**

```json
{
  "plans": {
    "items": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "gymOrgId": "33333333-3333-4333-8333-333333333333",
        "name": "Monthly Base",
        "kind": "BASE",
        "capability": null,
        "durationDays": 30,
        "price": 999,
        "active": true,
        "createdAt": "2026-08-08T12:00:00.000Z",
        "updatedAt": "2026-08-08T12:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

`items[]` = [plan](#shared-response-shape--plan). Page: `items`, `total`, `limit`, `offset`.

---

## Get plan

`GET /gym-orgs/:gymOrgId/plans/:planId` — Bearer ADMIN

**Path params**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `gymOrgId` | yes | string (uuid) | Gym | `"33333333-3333-4333-8333-333333333333"` |
| `planId` | yes | string (uuid) | Plan | `"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"` |

**200** `{ "plan": { … } }`

Errors: **404** `NOT_FOUND`

---

## Update plan

`PATCH /gym-orgs/:gymOrgId/plans/:planId` — Bearer ADMIN

`kind` and `capability` are **not** updatable after create.

```json
{
  "name": "Quarterly Base",
  "durationDays": 90,
  "price": 2499.5,
  "active": true
}
```

**Path params:** `gymOrgId`, `planId` (uuids)

**Request body**

| Property | Required | Type | Description | Values / example |
|----------|----------|------|-------------|------------------|
| `name` | yes | string | Plan name, 1–255 | `"Quarterly Base"` |
| `durationDays` | yes | integer | Days, 1–3650 | `90` |
| `price` | yes | number | Non-negative, ≤ 2 decimals | `2499.5` |
| `active` | yes | boolean | Soft-active flag | `true` \| `false` |

**200** `{ "plan": { … } }`

Errors: **403** · **404** · **422** `VALIDATION_ERROR`

---

## Delete plan

`DELETE /gym-orgs/:gymOrgId/plans/:planId` — Bearer ADMIN  
Body: none. Soft-deletes the plan (removed from active catalog).

**Path params:** `gymOrgId`, `planId` (uuids)

**204** empty body

Errors: **403** · **404** `NOT_FOUND`
