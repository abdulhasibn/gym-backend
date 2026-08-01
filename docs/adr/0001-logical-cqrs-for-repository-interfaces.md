# Logical CQRS for repository interfaces

**Status:** accepted

Command use cases (e.g. `ClaimMembership`) and read-heavy Admin surfaces (renewal lists, dashboards, roster tables) need different shapes from a repository: narrow lookups + `save` versus paginated, filtered, cross-cutting reads. Rather than one fat repository interface per aggregate covering both, each feature MUST expose a narrow command repository (invariant-preserving lookups + `save`) and a separate query interface (listing, filtering, reporting) per §10.

We deliberately chose **logical** CQRS, not physical: both interfaces are implemented against the same Supabase Postgres tables in the same transaction, with no eventual consistency and no projection/event-sourcing infrastructure. This keeps the split limited to interface segregation (avoiding command use cases depending on query methods they never call, and vice versa) without violating the Simplicity principle (§2.10) by introducing a second data store or async projection pipeline.

## Considered Options

- **Single repository interface per aggregate** (status quo) — rejected: forces command use cases to depend on query methods they never use (ISP violation), and couples invariant-preserving lookups to reporting/list shapes that evolve independently.
- **Physical CQRS** (separate read/write stores, projections) — rejected for MVP: introduces eventual consistency and infrastructure complexity with no current scaling requirement to justify it (§2.10, §2.9).
