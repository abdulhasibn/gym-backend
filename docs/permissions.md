# Frozen Role Permissions

`roles` and `role_permissions` are system-owned lookup data. They are seeded by a forward-only migration and are never editable by a gym.

Authorization remains layered:

```text
permission code ∧ active gym affiliation ∧ tenant predicate ∧ DataGrant (for Client-owned staff reads)
```

A permission code does not grant cross-gym access or let a client act on another user’s records. Ownership, affiliation, subscription entitlement, and grant checks are application-policy responsibilities.

## Roles

| Code | Lane | Purpose |
|---|---|---|
| `CLIENT` | `CLIENT` | Member account created during auth signup; a membership invitation later establishes gym affiliation |
| `STAFF_UNASSIGNED` | `STAFF` | Staff account before creating its first GymOrg or accepting an invite |
| `TRAINER` | `STAFF` | Trainer affiliation accepted at a GymOrg |
| `ADMIN` | `STAFF` | Gym owner or desk Admin affiliation |

## MVP permission matrix

| Permission | CLIENT | STAFF_UNASSIGNED | TRAINER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| `org:create` |  | x |  | x |
| `org:write` |  |  |  | x |
| `staff:invite` |  |  |  | x |
| `membership:read` | x |  | x | x |
| `membership:write` |  |  |  | x |
| `invite:write` |  |  |  | x |
| `billing:write` |  |  |  | x |
| `plan_catalog:write` |  |  |  | x |
| `attendance:read` | x |  | x | x |
| `attendance:write` | x |  |  | x |
| `checkin:block` |  |  |  | x |
| `coaching:assign` |  |  | x | x |
| `coaching:read` | x |  | x | x |
| `lead:read` |  |  |  | x |
| `lead:write` |  |  |  | x |
| `profile:write` | x | x | x | x |
| `grants:write` | x |  |  |  |

## Interpretation

- `CLIENT` permissions apply only to the authenticated client’s records.
- `STAFF_UNASSIGNED` can create a first GymOrg or maintain its own profile; it has no existing GymOrg affiliation.
- `TRAINER` cannot record desk attendance.
- `ADMIN` still needs a live affiliation at the relevant GymOrg. Admin-as-Trainer also receives a `trainer_profiles` row, but the Admin permission set permits the Admin workflow itself.
- `profile:write` is scoped to the actor’s own profile unless a later use case explicitly establishes a different authorized workflow.
- Client-owned staff reads additionally require the appropriate live `DataGrant` or `ProfileAttributeGrant`.
