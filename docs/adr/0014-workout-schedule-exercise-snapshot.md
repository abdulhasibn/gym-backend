# Workout schedule exercise snapshot (one list per date)

**Status:** accepted  
**Supersedes:** morning/evening template-pointer rules in ADR-0010  
**Does not change:** ADR-0011 completion window · ADR-0012 streaks

A `TRAINING` schedule date stores a **trainer-edited snapshot**: title + ordered catalog exercises. Import is a client prefill (`GET` gym template → draft → `PUT` the list). The server does not copy a template on assign. There is one workout per date (or REST / unscheduled), not morning/evening slots.

## Why

ADR-0010 required `morningTemplateId` / `eveningTemplateId` and snapshotted those templates. Trainers could not import, tweak sets/reps, and save a custom list without mutating the gym library or duplicating templates. Product no longer has morning/evening template slots.

## Rules

- **Write:** `PUT` still replaces only listed dates. `REST` has no exercises. `TRAINING` requires `exercises[]` (min 1 catalog line). Optional `title` (1–120) and `clonedFromTemplateId` (provenance only).
- **Provenance:** if `clonedFromTemplateId` is missing, other-gym, deleted, or unknown → save the list and store `null`. Never re-read the template on later GET.
- **Snapshot:** new exercise row ids on each save. Later template PATCH does not rewrite saved dates. Replacing a date drops prior completions on those old ids (same replace semantics as ADR-0010).
- **Unknown catalog id:** `422` `INVALID_WORKOUT_SCHEDULE`.
- **Read:** one list per date (`title`, `clonedFromTemplateId`, `exercises`). No `sessions[]`, `slot`, `morningTemplateId`, or `eveningTemplateId`.
- **Persistence:** `workout_schedule_sessions` remains a 1:1 container so exercise/completion FKs stay. Domain and HTTP drop slot. SQL `slot` stays as a constant on new rows.
- **Backfill:** flatten live dual-slot days (morning exercises first, then evening). Title = morning, evening, or `Morning / Evening` if both. Extra session is soft-deleted.

## Ownership / modules

`coaching` owns the schedule aggregate, upsert, and query DTOs. No new feature module.

## Considered options

- **Keep morning/evening ids with a compatibility window** — rejected: mobile has not shipped slot UI; dual contracts would linger.
- **Server-side assign-by-templateId XOR exercises (diet-style)** — rejected: import is client-side; a live template pointer would drop trainer edits.
- **Move exercises onto `workout_schedule_days`** — rejected: completion FKs and session rows stay; flatten in place.
