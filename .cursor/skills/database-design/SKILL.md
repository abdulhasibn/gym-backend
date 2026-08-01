---
name: database-design
description: Design and review database schemas, Prisma models, and Supabase configuration for correctness, security, and performance. Use when creating or editing .prisma files, writing migrations, designing tables/relations, adding indexes, configuring Supabase RLS policies, or reviewing database-related pull requests.
---

# Database Design

Apply these rules when designing schemas, writing migrations, or reviewing database code. The database is the source of truth for data integrity — push constraints into the DB, not just application code.

## Prisma Schema

- **Naming**: PascalCase singular model names, camelCase field names. Map to existing/legacy DB names with `@map` and `@@map` rather than changing the DB naming.
- **IDs**: `@id @default(autoincrement())` for integer IDs, `@default(cuid())` or `@default(uuid())` for string IDs.
- **Timestamps**: every model gets `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- **Relations**: always define both sides explicitly with `@relation`. Never leave a relation one-sided.
- **Foreign key indexes are NOT automatic.** Prisma does not index relation scalar fields on PostgreSQL/MySQL. Add `@@index([userId])` (or composite index) for every foreign key manually — missing FK indexes are the single most common Prisma performance bug (causes full table scans, 100x+ slowdowns at scale).
- **Composite indexes**: order fields by selectivity, equality-filtered fields before range-filtered ones (e.g. `@@index([userId, createdAt])` for "user's items sorted by time").
- **Enums over strings**: use Prisma `enum` for any fixed set of values — validated at the DB level, not just application level.
- **Constraints over app checks**: prefer `@unique`, `@@unique`, `NOT NULL` (default for non-`?` fields), and foreign key `onDelete`/`onUpdate` referential actions over equivalent application-level validation.
- **Multi-tenancy**: every tenant-scoped table includes a tenant/org id column with an index; every query filters by it.
- **Large schemas**: split into multiple files under `prisma/models/` (supported since v6.7.0) once a single `schema.prisma` gets unwieldy; keep `generator`/`datasource` blocks and `migrations/` at the top level.

## Prisma Queries & Client

- One global `PrismaClient` instance per process, reused everywhere. Multiple instances create multiple connection pools and can exhaust DB connections.
- Use `select`/`omit` to fetch only needed fields instead of full rows.
- Avoid N+1 queries: use `include`/relation loading or batched queries instead of looping with per-item queries.
- Use cursor-based pagination for large or unbounded result sets instead of large `skip`/`offset`.
- Wrap multi-step writes in `$transaction`.
- Raw queries (`$queryRaw`/`$executeRaw`) must use tagged-template parameterization — never interpolate untrusted input into raw SQL strings.

## Migrations

- Treat migrations as forward-only; don't hand-edit or delete applied migration files.
- Use `prisma migrate dev` locally to generate migrations, `prisma migrate deploy` in CI/production (never `migrate dev` or `db push` against production).
- Review generated SQL for dangerous operations before applying: adding a `NOT NULL` column without a default (needs backfill), dropping/renaming columns (data loss, update app code first), changing column types (may need explicit `USING` casts).
- For large existing tables, create indexes with `CONCURRENTLY` via a manual SQL migration to avoid locking writes.

## Supabase

- **Enable RLS on every table in the exposed schema (default `public`), no exceptions** — this includes new tables created via SQL editor/migrations, which don't get RLS by default (only Table Editor-created tables do).
- Never use the `service_role` key in client-side/browser code or ship it to end users — it bypasses RLS entirely. Keep it server-side only.
- **RLS performance**: wrap `auth.uid()` / `auth.jwt()` calls in a `(select ...)` inside policies, e.g. `using ((select auth.uid()) = user_id)`. This evaluates the function once per query instead of once per row (can be 100x+ faster). Only fold expressions that are constant per-user/per-query — never wrap row-dependent columns this way.
- Add an index on every column referenced in an RLS policy (e.g. `user_id`, `org_id`) — unindexed policy columns force sequential scans.
- Scope policies explicitly with `TO authenticated` (or the specific role) rather than leaving them open to all roles, so anonymous requests skip evaluation entirely.
- For complex/cross-table authorization checks, use a `SECURITY DEFINER` helper function: put it in a private, non-exposed schema, set `search_path = ''` explicitly, check the calling user's identity inside the function body, and `REVOKE EXECUTE` from `PUBLIC`/`anon`/`authenticated` where it shouldn't be called directly.
- Keep policies simple; policies with multiple joins or subqueries per row are the main source of slow queries. Measure with `EXPLAIN ANALYZE` if a query on an RLS-protected table exceeds ~50ms.
- If exposing a view to `anon`/`authenticated` roles, set `security_invoker = true` (Postgres 15+) so it respects the underlying tables' RLS instead of running as the view owner.

## General Database Design

- Normalize by default; denormalize deliberately only for measured read-performance needs, and document why.
- Index fields used in `WHERE`, `JOIN`, and `ORDER BY` on tables expected to grow large; don't index columns that are rarely queried (write cost).
- Define cascades (`onDelete: Cascade/SetNull/Restrict`) intentionally per relation — don't leave the default and assume it's safe.
- Use the narrowest correct data type (e.g. `smallint` vs `int`, `timestamptz` over `timestamp`).
- Document non-obvious schema decisions (e.g. why a field is denormalized, why an index is composite) as schema comments, not just in a PR description.

## Review Checklist

When reviewing or writing schema/migration changes, verify:

- [ ] Both sides of every relation are defined
- [ ] Every foreign key / relation scalar field has an `@@index`
- [ ] Fixed-value fields use `enum`, not raw strings
- [ ] `createdAt`/`updatedAt` present on new models
- [ ] Uniqueness and required-ness are enforced at the DB level, not just in app code
- [ ] Migration is safe to run against a populated production table (backfill/default for new `NOT NULL` columns, no blind drops)
- [ ] New Supabase tables have RLS enabled with policies for every operation they support (select/insert/update/delete)
- [ ] RLS policies use `(select auth.uid())` form and are backed by an index on the filtered column
- [ ] No `service_role` key or raw SQL string interpolation in client-reachable code
