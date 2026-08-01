# Subscription non-overlap and price snapshot

**Status:** accepted

A membership must not have overlapping live dated `Subscription` lines within BASE, or within the same ADDON capability, and may have at most one not-yet-started BASE (`start_date` null). “In-date” cannot be a partial unique predicate (`now()` is not immutable), so non-overlap is enforced in Postgres with an exclusion constraint over date ranges (`btree_gist`, with `kind`/`capability` denormalized onto the line as needed). Soft-deleted rows are excluded via `deleted_at IS NULL`.

Each subscription also snapshots `price_amount` and `duration_days` at creation so `amount_paid` / `payment_status` have a stable denominator; catalog price edits do not rewrite historical lines. Invites still carry no price snapshot.

## Considered Options

- **App-only overlap prevention** — rejected: renewal/check-in entitlement is the product wedge; double-billing must be unrepresentable.
- **Live catalog price as amount owed** — rejected: Admin catalog edits rewrite historical partial/paid meaning.
- **Versioned plan catalog** — rejected for MVP: heavier than a line-level snapshot.
