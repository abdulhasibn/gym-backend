# Roster (Admin + Trainer)

Gym member roster, trainer assign/reassign, offboard, and manual check-in block.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Prereq:** Client has accepted a membership invite — [`membership-invites.md`](membership-invites.md)  
**Status:** Stint 1.6 shipped (A3, A4, A15, A18, C3). Check-in block is enforced on attendance (2.1).

Auth: `Authorization: Bearer <accessToken>`. Errors: `{ "error": { "code", "message" } }`.

---

## Shared shape — `member` (roster row)

| Property | Type | Notes |
|----------|------|--------|
| `membershipId` | uuid | `client_memberships.id` |
| `clientUserId` | uuid | |
| `gymOrgId` | uuid | |
| `status` | `ACTIVE` \| `INACTIVE` | |
| `checkInBlocked` | boolean | Manual Admin safety valve |
| `assignedTrainerId` | uuid \| null | `trainer_profiles.id` |
| `clientName` / `clientEmail` / `clientPhone` | string | From `users` |
| `joinedAt` / `leftAt` | ISO \| null | |
| `basePaymentStatus` | `paid` \| `unpaid` \| `partial` \| null | BASE line badge |
| `baseAmountPaid` / `basePriceAmount` | number \| null | |

## Shared shape — `membership` (mutation result)

| Property | Type |
|----------|------|
| `membershipId`, `clientUserId`, `gymOrgId` | uuid |
| `status` | `ACTIVE` \| `INACTIVE` |
| `checkInBlocked` | boolean |
| `assignedTrainerId` | uuid \| null |
| `joinedAt` / `leftAt` / `updatedAt` | ISO |

---

## Admin — list gym members

`GET /gym-orgs/:gymOrgId/members`

Requires live gym Admin.

| Query | Default | Notes |
|-------|---------|--------|
| `status` | `ACTIVE` | `ACTIVE` \| `INACTIVE` |
| `q` | — | Optional search on name / email / phone |

**200:** `{ "members": [ member, ... ] }`  
**403** `PLAN_FORBIDDEN`

---

## Trainer — assigned members

`GET /gym-orgs/:gymOrgId/my-assigned-members`

Requires a live `trainer_profiles` row at the gym (Trainer or Admin-as-Trainer). Returns only members assigned to that profile.

| Query | Default | Notes |
|-------|---------|--------|
| `status` | all | Optional `ACTIVE` \| `INACTIVE` |
| `q` | — | Optional search |

**200:** `{ "members": [ member, ... ] }`  
**403** `ROSTER_FORBIDDEN`

---

## Admin — assign / reassign trainer

`POST /gym-orgs/:gymOrgId/members/:membershipId/assign-trainer`

```json
{ "trainerProfileId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
```

Requires live Admin. Membership must be **ACTIVE**. Client must have an **in-date** `TRAINER_COACHING` ADDON (payment ignored). Trainer profile must be live at the gym. Admin may assign to self via their own `trainer_profiles.id`.

**200:** `{ "membership": { ... } }`  
**404** membership / trainer not found  
**422** `COACHING_ADDON_REQUIRED` · `CLIENT_MEMBERSHIP_INVALID_TRANSITION`

---

## Admin — offboard

`POST /gym-orgs/:gymOrgId/members/:membershipId/offboard`

Sets membership `INACTIVE`, `left_at`, and soft-deletes **all** DataGrants for `(client, gym)` atomically (RPC). Attendance and subscriptions retained. Assigned trainer link kept for history.

**200:** `{ "membership": { ... } }`  
**404** · **409** already inactive

---

## Admin — block / unblock check-in

`PATCH /gym-orgs/:gymOrgId/members/:membershipId/check-in-block`

```json
{ "blocked": true }
```

Manual safety valve — not tied to payment status. Attendance (2.1) rejects check-in while blocked.

**200:** `{ "membership": { ... } }`  
**404** · **422** inactive membership
