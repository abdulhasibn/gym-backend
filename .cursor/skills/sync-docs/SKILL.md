---
name: sync-docs
description: >-
  Surgically sync gymBackend status docs and PRD showcase Orbit to Current
  stage, then redeploy gym-prd-visual. Use when the user asks to sync docs,
  update markdown status, refresh Orbit/prd-showcase, or redeploy the PRD
  visual after shipping a roadmap item.
disable-model-invocation: true
---

# Sync Docs + Redeploy Showcase

Keep **status-bearing** docs and the live Orbit site aligned with
[`docs/PROGRESS.md`](../../../docs/PROGRESS.md). Be surgical: grep for
stale markers, edit only hits, do not rewrite product/ADR/architecture prose.

## Constants

| | |
|---|---|
| Stage SoT | `docs/PROGRESS.md` (**Current stage** + **Next up**) |
| Build order SoT | `docs/MVP_ROADMAP.md` (status table) |
| Orbit data | `docs/prd-showcase/roadmap-data.js` |
| Orbit mirror | `docs/mvp-roadmap/roadmap-data.js` (keep byte-identical to Orbit data) |
| Product modules UI | `docs/prd-showcase/modules-data.js` |
| Orbit lede | `docs/prd-showcase/index.html` (Orbit section `<p class="lede">`) |
| Live site | https://gym-prd-visual.vercel.app |
| Vercel project | `gym-prd-visual` · `prj_EtVPC7ovvVam8sXPcfdePCZbwblP` |
| Team | `team_YaNwaQsqm2AabHG3hfU7us46` |
| Deploy cwd | `docs/prd-showcase/` |

## Checklist

```
- [ ] 1. Delta — read Current stage / Next up; name what just shipped
- [ ] 2. Grep — stale status markers only (do not open every .md)
- [ ] 3. Patch — markdown + Orbit data for hits only
- [ ] 4. Mirror — cp roadmap-data.js → docs/mvp-roadmap/
- [ ] 5. Deploy — vercel prod from docs/prd-showcase/; verify live copy
- [ ] 6. Progress — prepend Log; refresh Current stage if needed
```

## 1. Delta (cheap)

1. Read **Current stage** + **Next up** in `docs/PROGRESS.md` (and newest Log if useful).
2. Skim the matching rows in `docs/MVP_ROADMAP.md` status table.
3. Write one line: `Shipped: … · Next: … · Surfaces to touch: …`

If nothing shipped since last sync Log entry and user only wants redeploy → skip to **§5**.

## 2. Grep (find stale; do not browse)

Run targeted searches from repo root. Prefer `rg` over reading whole files.

**Always run when a roadmap id flipped Done → Todo lag:**

```bash
# Showcase / Orbit lag
rg -n 'status: "todo"|1\.[0-9].*shipped|next \(1\.|next \(2\.|subscriptions Admin|Phase 5' \
  docs/prd-showcase/roadmap-data.js docs/prd-showcase/modules-data.js docs/prd-showcase/index.html

# README / client surface lag
rg -n '^\*\*Next:\*\*|^\*\*Shipped|Not yet for CLIENT|Status:|## Deferred' \
  README.md docs/client-auth.md docs/api.md

# Feature guide Deferred / Status that still names shipped work
rg -n 'deferred|Deferred|next \(|Phase 5|1\.1–1\.[0-4] shipped' \
  docs/subscriptions.md docs/membership-invites.md docs/roster.md \
  docs/plans.md docs/leads.md docs/product-flows.md docs/MVP_ROADMAP.md
```

Add paths only for guides touched by the delta (e.g. after attendance lands, include that guide when it exists).

**Do not open / rewrite** unless a grep hit proves staleness:

- `docs/PRD.md`, `docs/architecture.md`, `docs/adr/*`, `CONTEXT.md`, `docs/schema.dbml`
- Unrelated feature guides
- Showcase CSS/JS app shells (`app.js`, `orbit-app.js`, …) unless copy is wrong

## 3. Patch (surgical)

### Markdown

| Surface | What to align |
|---|---|
| `README.md` | Shipped / Next blurb + integration table links |
| `docs/MVP_ROADMAP.md` | Status cells, **Current** line, exit criteria if exit moved |
| Feature guide for the slice | **Status** / **Deferred** — remove shipped items from Deferred; link the owning guide |
| `docs/client-auth.md` | CLIENT “available now” vs “Not yet”; link staff guides when staff APIs shipped |
| `docs/api.md` | Index + “Not shipped yet” list |
| `docs/product-flows.md` | **API status** lines / build-scope tables for the affected module only |

Edit the smallest span that fixes the lie. Prefer one-line Status updates over section rewrites.

### Orbit (`prd-showcase`)

1. In `roadmap-data.js`: set shipped item `status: "done"`; refresh stint `tagline` / `outcome` / `exit` if the stint boundary moved; note deferred bits in `body`/`detail` only when still true (e.g. A8b, enforcement in a later stint).
2. In `modules-data.js`: flip only the **items** bullets for the module(s) that shipped (`— next (X.Y)` → `— API live (X.Y)`). Leave other modules alone.
3. In `index.html`: update Orbit `<p class="lede">` to name what is lit and the **next** node id.

### Mirror

```bash
cp docs/prd-showcase/roadmap-data.js docs/mvp-roadmap/roadmap-data.js
diff -q docs/prd-showcase/roadmap-data.js docs/mvp-roadmap/roadmap-data.js
```

`MVP_ROADMAP.md` says the mirror exists for old bookmarks — keep data identical; do not dual-edit by hand.

## 4. Deploy

From `docs/prd-showcase/`:

```bash
TOKEN=$(python3 -c "import json; print(json.load(open('$HOME/Library/Application Support/com.vercel.cli/auth.json'))['token'])")
npx --yes vercel --prod --yes --token "$TOKEN" --scope team_YaNwaQsqm2AabHG3hfU7us46
```

- Expect alias `https://gym-prd-visual.vercel.app`.
- If CLI returns `Not authorized` without `--token`, retry with the token form above (user approval may be required for reading auth.json).
- Do **not** invent a new Vercel project; do **not** deploy from `docs/mvp-roadmap/`.

### Verify (required)

```bash
curl -sL https://gym-prd-visual.vercel.app/ | grep -o 'Three orbits[^<]*'
curl -sL https://gym-prd-visual.vercel.app/roadmap-data.js | grep -E 'tagline:|id: "X.Y"|status:' | head -40
```

Confirm lede + shipped node `status: "done"` match the delta. Spot-check `modules-data.js` only if that file changed.

## 5. Progress log

Per `.cursor/rules/progress-log.mdc`:

1. Refresh **Current stage** if the sync itself closes a docs gap worth stating.
2. Prepend a Log entry (newest first): what docs/Orbit changed + deploy URL/alias.
3. Do not rewrite older Log entries.

## Anti-patterns

- Reading every `docs/**/*.md` “just in case”
- Marking Orbit `done` when only docs exist (status follows shipped API / Progress)
- Leaving `mvp-roadmap/roadmap-data.js` out of sync
- Redeploying without a content change (unless user asked deploy-only)
- Editing PRD normative behavior to reflect build status — status lives in Progress / Roadmap / Orbit

## Done criteria

- Grep patterns for the shipped ids no longer show “next” / `todo` on those ids
- `roadmap-data.js` copies identical
- Live Orbit lede + node status match Progress
- Progress Log entry recorded
