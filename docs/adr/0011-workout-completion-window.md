# Workout schedule completion window and adherence overlay

**Status:** accepted

Clients may complete (or uncomplete) a schedule exercise line for schedule date `D` when gym-local **today** is in the inclusive window **`[D, D+2]`**, and never when `D` is in the future. Completions are keyed by **`completed_on = D`** (the assigned calendar day), not the wall-clock tick day. Staff see completion / day-done / adherence % only with a live **`WORKOUT_PLANS`** class grant.

Diet assign and diet adherence (diary / `DIET_PLANS`) stay unchanged. Streaks are a later phase.

## Why

Phase 2 (ADR-0010) allowed ticks only when `today === D`, which blocked catch-up on yesterday or the next two gym-local days. Storing `completed_on` as the tick day would also break uniqueness and calendar overlays once the window widens. Staff needed an adherence overlay gated like other ClientOwned reads (ADR-0002), without requiring that grant to author or read the schedule definition.

## Rules

- **Window:** allow complete/uncomplete iff `D <= today` and `today <= D + 2` days (gym-local calendar). Reject otherwise with `INVALID_WORKOUT_SCHEDULE`.
- **`completed_on`:** always the schedule date `D`. Unique `(workout_schedule_exercise_id, completed_on)` therefore yields at most one tick per schedule line.
- **Partial days:** allowed. **`dayDone`:** `true` when every exercise in every session on that day is completed; **`true` for `REST` days** (no exercises — vacuous complete so calendars do not look unfinished).
- **`adherencePercent`:** TRAINING only when overlay present — integer `0–100` from `completedCount / exerciseCount` (0 if no exercises, which TRAINING forbids at write time).
- **Client GET:** always overlays `completed` / `dayDone` / `adherencePercent` for days in the requested range.
- **Staff GET:** definition always (assigned Trainer / Admin-as-Trainer). Adherence fields only when `WORKOUT_PLANS` is granted for `(client, gym)`.
- **Clock vs slot:** morning sessions may be completed in the evening under the same calendar window.
- **Streaks:** current/longest streak reads are defined in **ADR-0012** (compute-on-read from schedule + completions).

## Ownership / modules

`coaching` owns the window helper, completion writes, and overlay assembly. Grant presence is loaded via a feature-local `ClientDataGrantGate` wired at composition-root to memberships queries (H8).

## Considered options

- **Keep `today === D`** — rejected: product requires a two-day catch-up.
- **`completed_on = today` under a wide window** — rejected: allows multiple rows per line and breaks date-keyed GET overlays.
- **Auto-grant `WORKOUT_PLANS` on assign** — rejected (ADR-0002): adherence stays consent-gated.

Supersedes the Phase-2 completion window paragraph in ADR-0010.
