# Client workout schedule (date-based morning/evening/rest)

**Status:** accepted

Assigned workouts are no longer a single day-labeled `WorkoutPlan` (Push/Pull). Trainers upsert **calendar dates** for a client at a gym: an explicit **REST** day, or a **TRAINING** day with one or two sessions (`MORNING` / `EVENING`). Each session is a **snapshot** of a gym `WorkoutPlanTemplate` (ADR-0009). Later template edits do not rewrite snapshotted sessions.

Diet assign and diet templates (ADR-0008) stay unchanged.

## Why

Desk PT assigns work by calendar (including rest and optional twice-daily sessions). Free-form day labels and “complete any line today” do not encode which session is due on which date. A Client-owned schedule keyed by `(client, assigning gym, date)` matches provenance rules (ADR-0002) without making the gym the data owner of completions.

## Rules

- **`WorkoutScheduleDay`**: Client-owned instance with assigning-gym provenance (`gym_org_id`, `trainer_id`). Unique live `(client_user_id, gym_org_id, schedule_date)`.
- **`kind`**: `REST` (no sessions) **or** `TRAINING` (1–2 sessions).
- **`WorkoutScheduleSession`**: `slot` = `MORNING` | `EVENING`; unique per day; `title` + `cloned_from_template_id` snapshotted from a live template at upsert; nested exercises copied with new ids.
- **Upsert**: staff replaces only the dates listed in the request body. Assign body carries `templateId`s only — never an exercise list.
- **Gates**: assigned Trainer or Admin-as-Trainer; in-date `TRAINER_COACHING` on the target client; active membership.
- **Completions:** `workout_schedule_exercise_completions` on schedule exercise ids. Completion window, `completed_on = schedule_date`, day-done, and staff `WORKOUT_PLANS` adherence overlay are defined in **ADR-0011** (supersedes the Phase-2 `today === schedule_date` rule).
- **Product cutover**: HTTP for dayLabel `workout_plans` assign/GET/complete is retired. Legacy tables may remain in the DB unused.

## Ownership / modules

`coaching` owns schedule aggregates. Schedule branded ids stay feature-local until a second feature needs them (H9).

## Considered options

- **Keep one ACTIVE WorkoutPlan with day labels** — rejected: cannot express date rest or morning/evening.
- **Week enum / rotating Day1–N** — rejected: product is date-wise assign.
- **Point sessions at live templates without snapshot** — rejected: template edits would mutate past/future assigned days.

Downstream schema: `docs/schema.dbml`, migration `20260902100000_workout_schedule.sql`.
