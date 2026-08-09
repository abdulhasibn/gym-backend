---
name: sync-postman
description: >-
  Sync Gym Backend API Postman collection between cloud and
  ../gym-backend-postman. Checks both, adds new APIs into an existing or new
  feature folder (never collection root), refreshes property docs + Examples
  for every request, then updates git + cloud. Use when the user asks to sync
  Postman, push Postman to cloud, update the Postman collection, or after
  shipping new HTTP endpoints.
disable-model-invocation: true
---

# Sync Postman

Keep **cloud** and **git export** aligned. Every feature = one top-level folder.

**Every run** must refresh **request Docs** (property explanations) and
**Examples** for all shipped APIs — not only when structure diffs.

## Constants

| | |
|---|---|
| Cloud name | `Gym Backend API` |
| Collection UID | `25800783-a442e881-b024-4178-89ad-accb66ac1d58` |
| Collection UUID (for `updateCollectionRequest`) | `a442e881-b024-4178-89ad-accb66ac1d58` |
| Workspace | My Workspace `0d0a265c-cd52-4ef5-88f5-89836cf412d1` |
| Git export | `../gym-backend-postman/Gym-Backend-API.postman_collection.json` |
| MCP (working) | `user-postman_mcp_server` |
| Backend guides | `docs/api.md`, `docs/client-auth.md`, `docs/plans.md`, `docs/membership-invites.md`, `docs/leads.md` |

Do **not** use `plugin-postman-postman` for writes unless auth is confirmed (folder APIs often 403).

## Checklist

```
- [ ] 1. Diff: structure (folders/requests) vs cloud + shipped routes
- [ ] 2. Edit git export (folders + requests + vars + README if needed)
- [ ] 3. Refresh Docs + Examples for EVERY request (mandatory every run)
- [ ] 4. Audit: node .cursor/skills/sync-postman/scripts/audit-docs-examples.mjs
- [ ] 5. Commit + push gym-backend-postman (if changed)
- [ ] 6. putCollection async → verify folders + spot-check Docs/Examples on cloud
```

Do **not** stop after a clean structure diff. Step 3 always runs unless Docs and
Examples already pass the audit against current schemas (re-run audit to prove it).

## 1. Diff (cheap)

1. `getCollections` workspace + name `Gym Backend API` if UID unknown.
2. `getCollection` UID → read **itemRefs only** (folder + request names). Do not fetch full request bodies unless editing one request.
3. Compare to local JSON top-level `item[].name` and nested request names.
4. Also check shipped routes / Progress / this session’s new endpoints vs collection.

**Needs structural edit if** any new endpoint is missing from git **or** cloud, or cloud has root-level feature requests (should be under a folder).

Structure match alone is **not** “done” — continue to Docs + Examples.

## 2. Edit git export first

Source of truth for structure: local JSON, then push to cloud.

**Folder rule**

- Assign new APIs to an **existing** top-level folder when they belong to that feature (e.g. more plan routes → `Plans`).
- Else create a **new** top-level folder named for the feature (mirror `src/features/<name>/`).
- **Never** leave feature requests at collection root.

**Request shape** (match Leads/Plans): method + path description; `Content-Type` + `Accept`; Bearer via collection auth; optional test script; collection/env vars for new IDs (e.g. `planId`). No committed tokens.

Update README smoke flow only if the happy-path changes.

## 3. Refresh Docs + Examples (mandatory every run)

Source of truth for field names / enums / constraints: feature `*.schemas.ts`,
domain enums/VOs, DTOs, and the markdown guides under `docs/`. Keep Postman and
guides aligned.

### Docs (request `description`)

Postman Docs **does not reliably render Markdown tables**. Use **bullet lists only**.

For each request, cover:

- One-line method + path + purpose
- Auth / path / query / body as applicable
- **Every property**: required/optional, type, short meaning, full enum list or string example
- Success status + response fields (nested objects listed)
- Important error codes

**Format (canonical):**

```markdown
PATCH /gym-orgs/:gymOrgId/leads/:leadId/status — move pipeline stage.

**Auth:** Bearer ADMIN  
**Path:** `gymOrgId`, `leadId`

**Request body (JSON):**
- `status` (required, enum) — New pipeline status. Values: `NEW`, `CONTACTED`, `TRIAL`, `CONVERTED`, `LOST`. Example: `"CONTACTED"`.

**Success `200`:** `{ lead }` with updated `status`  
**Errors:** `404` · `422` VALIDATION_ERROR
```

Rules:

- Enums: comma-separated Values (`paid`, `unpaid`, `partial`) — **never** `|` inside a table cell
- No `|---|` / pipe tables in Postman descriptions
- Body-less endpoints: skip body bullets; still document path/query + response
- Prefer linking to gym-backend `docs/<guide>.md` for deep guides

### Examples (saved responses under each request)

Every request must have at least one saved **Example**. Prefer:

| Request kind | Minimum Examples |
|---|---|
| Happy-path mutate (POST/PATCH/PUT) | Success (`2xx`) **and** one representative error (`4xx` with `{ error: { code, message } }`) |
| Happy-path read (GET list/detail) | Success page/object (`200`) — add error Example when authz/not-found is commonly hit |
| `204` / redirects | Single matching Example is enough |
| Negative-case folder requests | The intended error Example only |

Example body rules:

- Realistic JSON matching current DTOs (uuids, ISO timestamps, enum values)
- Errors always `{ "error": { "code": "…", "message": "…" } }`
- No real OTP codes, access tokens, or PII
- Name Examples clearly: `200 OK — …`, `201 Created — …`, `422 — VALIDATION_ERROR`

When schemas/DTOs change, **update existing Examples** — do not leave stale shapes.

### How to apply

1. Edit descriptions + `response[]` Examples in the **git export** JSON first.
2. Optionally sync Docs-only via many `updateCollectionRequest` calls, but a full
   `putCollection` (step 6) is required so Examples and folder structure stay aligned.

## 4. Audit

```bash
node .cursor/skills/sync-postman/scripts/audit-docs-examples.mjs
# exit 0 = pass; prints gaps for missing Examples, MD tables, thin docs
```

Fix gaps before commit. Do not push a collection that fails the audit unless the
user explicitly waives a listed gap.

## 5. Git push

In `../gym-backend-postman`: commit (e.g. `docs: refresh Postman property docs and Examples`) + `git push origin HEAD`. Needs `all` permissions (repo outside gymBackend).

## 6. Cloud sync (required when git changed or cloud lagging)

**Prefer `putCollection`** with `Prefer: "respond-async"` — preserves folders and
pushes Docs + Examples together. Do **not** use `createCollectionRequest` for new
features (lands at root).

Prepare payload:

```bash
node .cursor/skills/sync-postman/scripts/prepare-put.mjs
# writes /tmp/gym-backend-postman-put.json
```

Then `CallMcpTool` → `user-postman_mcp_server` / `putCollection` with that file’s JSON (`collectionId`, `Prefer`, `collection`). Large payload: use a subagent if needed.

If `putCollection` hangs/fails, fall back to:

1. `updateCollectionRequest` for description (+ `queryParams`) per request
2. Still retry `putCollection` for Examples — request-level PATCH does not reliably replace all Examples

Poll until done, then `getCollection` and confirm:

- Folders exist under top-level `itemRefs`; requests **inside** folders, not root
- Spot-check 1–2 requests: Docs are bullet lists (no `|---|`); Examples present

## Done

One short report: folders touched, request names, Docs/Examples refreshed yes/no, audit pass, git commit (if any), cloud verified yes/no.
