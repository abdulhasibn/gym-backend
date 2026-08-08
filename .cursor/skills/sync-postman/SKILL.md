---
name: sync-postman
description: >-
  Sync Gym Backend API Postman collection between cloud and
  ../gym-backend-postman. Checks both, adds new APIs into an existing or new
  feature folder (never collection root), then updates git + cloud. Use when
  the user asks to sync Postman, push Postman to cloud, update the Postman
  collection, or after shipping new HTTP endpoints.
disable-model-invocation: true
---

# Sync Postman

Keep **cloud** and **git export** aligned. Every feature = one top-level folder.

## Constants

| | |
|---|---|
| Cloud name | `Gym Backend API` |
| Collection UID | `25800783-a442e881-b024-4178-89ad-accb66ac1d58` |
| Workspace | My Workspace `0d0a265c-cd52-4ef5-88f5-89836cf412d1` |
| Git export | `../gym-backend-postman/Gym-Backend-API.postman_collection.json` |
| MCP (working) | `user-postman_mcp_server` |

Do **not** use `plugin-postman-postman` for writes unless auth is confirmed (folder APIs often 403).

## Checklist

```
- [ ] 1. Diff: what is missing?
- [ ] 2. Edit git export (folder + requests + vars + README if needed)
- [ ] 3. Commit + push gym-backend-postman (if changed)
- [ ] 4. putCollection async → verify Plans-style folder on cloud
```

## 1. Diff (cheap)

1. `getCollections` workspace + name `Gym Backend API` if UID unknown.
2. `getCollection` UID → read **itemRefs only** (folder + request names). Do not fetch full request bodies unless editing one request.
3. Compare to local JSON top-level `item[].name` and nested request names.
4. Also check shipped routes / Progress / this session’s new endpoints vs collection.

**Needs update if** any new endpoint is missing from git **or** cloud, or cloud has root-level feature requests (should be under a folder).

If both already match and folders are correct → stop; say so in one line.

## 2. Edit git export first

Source of truth for structure: local JSON, then push to cloud.

**Folder rule**

- Assign new APIs to an **existing** top-level folder when they belong to that feature (e.g. more plan routes → `Plans`).
- Else create a **new** top-level folder named for the feature (mirror `src/features/<name>/`).
- **Never** leave feature requests at collection root.

**Request shape** (match Leads/Plans): method + path description; `Content-Type` + `Accept`; Bearer via collection auth; optional test script; collection/env vars for new IDs (e.g. `planId`). No committed tokens.

Update README smoke flow only if the happy-path changes.

## 3. Git push

In `../gym-backend-postman`: commit (e.g. `docs: add <Feature> folder`) + `git push origin HEAD`. Needs `all` permissions (repo outside gymBackend).

## 4. Cloud sync (required when git changed or cloud lagging)

**Prefer `putCollection`** with `Prefer: "respond-async"` — preserves folders. Do **not** use `createCollectionRequest` for new features (lands at root).

Prepare payload:

```bash
node .cursor/skills/sync-postman/scripts/prepare-put.mjs
# writes /tmp/gym-backend-postman-put.json
```

Then `CallMcpTool` → `user-postman_mcp_server` / `putCollection` with that file’s JSON (`collectionId`, `Prefer`, `collection`). Large (~90KB): fine via subagent if needed.

Poll until done, then `getCollection` and confirm:

- New/updated folder exists under top-level `itemRefs`
- Requests are **inside** that folder, not root

## Done

One short report: folders touched, request names, git commit (if any), cloud verified yes/no.
