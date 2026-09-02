# Gym workout plan templates (trainer-authored library)

**Status:** accepted

Reusable workout structure lives in a gym-owned template library, authored by a Trainer (or Admin-as-Trainer) at that gym. Templates hold a **flat exercise list** only (no Push/Pull day labels, no calendar schedule). Assigning templates onto client calendar dates (morning/evening/rest) is a later phase — out of this ADR.

Diet templates and diet assign (ADR-0008) stay unchanged.

## Why

Desk PT reuses the same circuit / strength blocks across members. Authoring only on the client assign call means every reuse is copy-paste. A gym library with trainer authorship matches diet’s template pattern without mixing Gym-owned and Client-owned rows in `workout_plans`.

## Rules

- **`WorkoutPlanTemplate`**: Gym-owned (`gym_org_id`). `trainer_id` is the authoring live trainer profile at that gym — not a data owner that replaces the gym.
- **Shape:** title, notes, ordered exercises (`exercise_item_id` + optional sets/reps/notes). Seed catalog exercises only (ADR-0007). No nested days.
- **Visibility:** **Read** is gym-global (any live Trainer / Admin-as-Trainer at that gym lists and gets any live template). **Mutate** (update/delete) is author or Admin-as-Trainer only.
- **Duplicate:** any live trainer at the gym may duplicate any gym template; the copy’s `trainer_id` is the **duplicator**; `cloned_from_id` points at the source.
- Creating/duplicating a template does **not** require a client or coaching addon. Seed `exercise_items` must exist and be live.
- Soft-delete keeps historical rows; later assign/schedule snapshots must not depend on rewriting the library row.
- **Out of this ADR:** date schedule, morning/evening/rest, assign-from-template onto clients, `cloned_from_template_id` on `workout_plans`, CustomExercise, template seed data, diet changes.

## Ownership / modules

`coaching` owns templates. `WorkoutPlanTemplateId` stays in `src/features/coaching/domain/` until a second unrelated feature persists it (H9).

## Considered options

- **Copy diet list ACL (trainer sees own only)** — rejected: product wants gym-global read for workout templates.
- **Days inside templates (Push/Pull)** — rejected: schedule is a separate date-based entity; template is exercises alone.
- **Nullable `workout_plans.client_user_id` for templates** — rejected: same as ADR-0008; keep a separate table.

Downstream schema: `docs/schema.dbml`, migration `20260902090000_workout_plan_templates.sql`.
