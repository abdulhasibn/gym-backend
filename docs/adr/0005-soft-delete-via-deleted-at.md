# Soft delete via deleted_at

**Status:** accepted

Mutable business entities use `deleted_at timestamptz NULL` (null = live) instead of `is_deleted boolean`. Repositories exclude non-null `deleted_at` by default; partial uniques use `WHERE deleted_at IS NULL`. This preserves *when* a grant revoke, wearable disconnect, or offboarding soft-delete happened — relevant for support and DPDP timing — without changing soft-delete semantics. Lifecycle statuses and the erasure procedure (ADR-0003) remain separate concepts.

PRD v2.3, `docs/schema.dbml`, and `docs/architecture.md` §12 use `deleted_at`.

## Considered Options

- **Keep `is_deleted` only** — rejected: loses revocation/offboard timestamps.
- **Boolean plus optional `deleted_at` on some tables** — rejected: two conventions for the same idea.
