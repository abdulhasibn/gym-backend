# Subscriptions (Admin + Client)

Admin payment status / start override and Client subscription reads after invite accept.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Prereq:** Accept already creates snapshotted lines — [`membership-invites.md`](membership-invites.md)  
**Status:** Stint 1.5 **core** shipped (payment + start override + C10). Addon attach / renew deferred ([`MVP_ROADMAP.md`](MVP_ROADMAP.md)).

Auth: `Authorization: Bearer <accessToken>`. Errors: `{ "error": { "code", "message" } }`.

---

## Shared shape — `subscription`

| Property | Type | Notes |
|----------|------|--------|
| `id` | uuid | Subscription line id |
| `clientMembershipId` | uuid | Owning ACTIVE membership |
| `gymOrgId` | uuid | Tenancy |
| `planId` | uuid | Catalog plan snapshotted at create |
| `kind` | `BASE` \| `ADDON` | Denormalized |
| `capability` | `TRAINER_COACHING` \| null | Null for BASE |
| `priceAmount` | number | Snapshot; payment denominator |
| `durationDays` | int | Snapshot |
| `startDate` | `YYYY-MM-DD` \| null | Null = unstarted BASE |
| `endDate` | `YYYY-MM-DD` \| null | Inclusive end |
| `startSource` | `FIRST_ATTENDANCE` \| `ADMIN_OVERRIDE` \| `ADMIN_ATTACH` \| null | |
| `paymentStatus` | `paid` \| `unpaid` \| `partial` | Does **not** lock entitlements |
| `amountPaid` | number | `unpaid`→0; `paid`→price; `partial`→(0, price) |
| `createdAt` / `updatedAt` | ISO | |

---

## Admin — list client subscriptions

`GET /gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions`

Requires live gym Admin. Resolves the client's **ACTIVE** membership at the gym.

**200:** `{ "subscriptions": [ subscription, ... ] }`  
**403** `PLAN_FORBIDDEN` · **404** no ACTIVE membership

---

## Admin — update payment

`PATCH /gym-orgs/:gymOrgId/subscriptions/:subscriptionId/payment`

```json
{ "paymentStatus": "paid" }
```

```json
{ "paymentStatus": "partial", "amountPaid": 250.5 }
```

- `paid` / `unpaid`: `amountPaid` optional; server derives from snapshotted `priceAmount`.
- `partial`: `amountPaid` required, strictly between 0 and price.

**200:** `{ "subscription": { ... } }`  
**403** · **404** · **422** `INVALID_SUBSCRIPTION_PAYMENT` / Zod

---

## Admin — start override (A19)

`POST /gym-orgs/:gymOrgId/subscriptions/:subscriptionId/start-override`

```json
{ "startDate": "2026-08-01" }
```

Only **unstarted BASE** (`startDate` null). Sets `endDate = startDate + durationDays - 1`, `startSource = ADMIN_OVERRIDE`.

**200:** `{ "subscription": { ... } }`  
**422** `INVALID_SUBSCRIPTION_START` (ADDON or already started)  
**409** overlap with another live dated line (ADR-0004)

---

## Client — my subscriptions (C10)

`GET /gym-orgs/:gymOrgId/my-subscriptions`

Requires `CLIENT` lane + ACTIVE membership at gym.

**200:** `{ "subscriptions": [ ... ] }`  
**403** `SUBSCRIPTION_FORBIDDEN` · **404** no ACTIVE membership

---

## Deferred

- Addon attach mid-cycle (A8b) / renew as new row (F4.4)
- FIRST_ATTENDANCE start (needs attendance)
- Roster / trainer assign (Phase 5 / 1.6)
