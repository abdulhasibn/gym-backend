# Architecture compliance pitfalls

Concrete PASS/FAIL pairs for gymBackend. Use with [`SKILL.md`](SKILL.md). Each pair is one decision — score the matching H-id.

---

## 1. Soft-warn lookup on create/update (H5)

**FAIL — command UC depends on query interface**

```
CreateLeadUseCase(repo, queries, policy)
// create: ids = await queries.findOpenByPhone(...)
```

**PASS — lookup on command repository**

```
CreateLeadUseCase(repo, policy)
// create: ids = await repo.findOpenLeadIdsByPhone(...)
// then repo.save(lead); return warnings in DTO
```

Soft warn itself (200/201 + `warnings[]`) is fine. The port used for the lookup is what H5 judges.

---

## 2. GymOrgId for a second feature (H9)

**FAIL — fuzzy or aggregate import**

- Plan: “GymOrgId via shared or same brand pattern”
- Code: `import { GymOrg } from '../../gym-orgs/domain/gym-org.entity'`
- Code: duplicate `Brand<string, 'GymOrgId'>` in leads with no shared move

**PASS — promote branded id**

- `src/domain/shared/gym-org-id.ts` exports `GymOrgId` / `toGymOrgId`
- gym-orgs and leads both import from shared
- Leads holds `gymOrgId: GymOrgId` only — never the `GymOrg` entity

---

## 3. Live admin check across features (H8)

**FAIL**

```
// features/leads/application/lead-admin.policy.ts
import type { GymOrgAdminDirectory } from '../../gym-orgs/domain/gym-org-admin.directory';
import { SupabaseGymOrgRepository } from '../../gym-orgs/infrastructure/...'; // worse
```

**PASS**

```
// features/leads/domain/live-gym-admin.port.ts
export interface LiveGymAdminPort {
  isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean>;
}
// composition-root: composeLeadsFeature(..., { isLiveAdmin: gymOrgRepo.isLiveAdmin.bind(gymOrgRepo) })
```

---

## 4. Nested gym URLs vs feature ownership (H1 / H8)

**FAIL** — `POST /gym-orgs/:id/leads` handler added inside `features/gym-orgs/presentation/`

**PASS** — same URL mounted from app routes; controller/schemas/use cases live in `features/leads/`

---

## 5. List/get reconstituting entities (H12)

**FAIL**

```
ListLeadsUseCase {
  constructor(private readonly repo: LeadRepository) {}
  execute() { return this.repo.findAll(...); } // returns Lead[]
}
```

**PASS**

```
ListLeadsUseCase {
  constructor(private readonly queries: LeadQueries) {}
  execute() { return this.queries.list(...); } // Page<LeadSummary>
}
```

---

## 6. Fat port (H5)

**FAIL**

```
interface LeadRepository {
  save(lead: Lead): Promise<void>;
  list(criteria, page): Promise<Page<LeadSummary>>;
  listDueFollowUps(...): Promise<Page<LeadSummary>>;
}
```

**PASS** — command: `findById` / `save` / invariant lookups; query: `get` / `list` / `listDueFollowUps` on a separate interface.

---

## 7. Zod re-implements VO (H3)

**FAIL** — schema `z.string().min(1).max(32)` for phone while `LeadPhone.create` exists with the same rules and schema never calls it.

**PASS** — schema transforms/refines via `LeadPhone.create` (catch → Zod issue).

---

## 8. Tenant / soft-delete omitted (H10)

**FAIL** — `from('leads').select('*').eq('id', leadId)` with no `gym_org_id` and no `deleted_at` filter.

**PASS** — `.eq('gym_org_id', gymOrgId).is('deleted_at', null)` on default reads/writes; gymOrgId required on the port method.
