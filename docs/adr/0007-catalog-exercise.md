# Catalog exercise (Hevy-style identity, assigned plans)

**Status:** accepted

Free-text exercise names (`workout_plan_exercises.name`) are unrepresentable. Every prescribed workout line is an `ExerciseItem` plus trainer notes and a sets/reps prescription. Completing still writes a per-day `PlanCompletion` — not a Hevy session log of actual loads. Stint 3.2 ships a 30-movement seed + assign/search against that catalog.

## Why

Hevy never lets a routine or workout line store a typed name. Identity is an `ExerciseTemplate`: **movement × equipment** (`Bench Press (Barbell)` ≠ `Bench Press (Dumbbell)`), plus a frozen measurement type (how a set is counted) and a primary muscle. Indian PT desks need the same picker as diet: search the owned catalog, miss path is structured custom later — not `name varchar`.

We copy that **identity** pattern. We do **not** copy Hevy’s library, images, or Workout+Set diary. Research: [`docs/research-hevy-exercise-catalog.md`](../research-hevy-exercise-catalog.md). PRD C6 remains a calendar-day tick.

## Rules

- **`ExerciseItem`**: catalog movement. **Name includes equipment** where it changes the movement. `aliases` for search. `primary_muscle`, `equipment`, `measurement` are frozen enums.
- **`exercise_source.seed`**: platform catalog (`created_by_user_id` and `gym_org_id` null). **`manual`**: structured **CustomExercise** only — Client-owned (`created_by` set, gym null) or gym-scoped (`both` set). Not a typed plan-line name. CustomExercise **APIs are deferred** (same as CustomFood in 3.1); columns exist so the miss path is representable.
- Search: seed always; later, staff assign also that gym’s customs. Clients do not browse other gyms’ customs.
- Plan line: `exercise_item_id` **not null**. `sets` / `reps` remain a **prescription** (reps stays varchar for ranges like `8-12` or plank `45s`). Completions stay on `workout_plan_exercise_completions` (`PlanCompletion`). Calendar day = assigning gym timezone.
- **`WORKOUT_PLANS` grant**: staff adherence (completions). Assigning Trainer authors the plan definition without that grant.
- **No Hevy/wger/ExerciseDB as the store.** No scrape of Hevy titles or GIFs. No set-by-set load history in this ADR.

### Frozen pickers (desk gym, not Hevy’s full 20/9/10)

**Muscle** `exercise_muscle`: `CHEST` | `LATS` | `UPPER_BACK` | `LOWER_BACK` | `SHOULDERS` | `BICEPS` | `TRICEPS` | `QUADS` | `HAMSTRINGS` | `GLUTES` | `CALVES` | `CORE` | `FULL_BODY` | `CARDIO` | `OTHER`

**Equipment** `exercise_equipment`: `BARBELL` | `DUMBBELL` | `MACHINE` | `CABLE` | `BODYWEIGHT` | `KETTLEBELL` | `BAND` | `OTHER`  
(`CABLE` is first-class — Indian commercial gyms; Hevy folds it into machine/other.)

**Measurement** `exercise_measurement`: `WEIGHT_REPS` | `REPS_ONLY` | `DURATION` | `BODYWEIGHT_ASSISTED`

Secondary muscles, demo assets, and Hevy distance/cardio types are out of this seed.

## Ownership / modules

`coaching` owns `ExerciseItem` and workout (and diet) plan instances. Search and assign are coaching use cases. `ExerciseItemId` lives in `src/features/coaching/domain/` until a second unrelated feature persists it — then promote to `src/domain/shared` (H9). Seed rows are platform data, not `GymOwnedRecord` / `ClientOwnedRecord`.

## Considered Options

- **Keep `name varchar` until the catalog is large** — rejected: garbage names become the default; assigned lines never match a searchable movement.
- **Import Hevy’s 400+ library via their Pro API** — rejected: proprietary; API is account-scoped and explicitly unstable; not a redistribution license.
- **Bulk-load wger** — rejected: AGPL-3.0; not India-gym-first.
- **Clone Hevy Workout + Sets in 3.2** — rejected: C6 is per-day `PlanCompletion`, not load tracking.
- **New `src/features/workouts/` module** — rejected: catalog exists only to assign/complete plans already owned by `coaching` (diet is the precedent).

Downstream schema: `docs/schema.dbml`, migrations `20260817120000_catalog_exercise.sql` and `20260817121500_seed_exercise_catalog_v1.sql`.
