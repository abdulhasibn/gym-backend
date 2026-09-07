# @bryllim/workout-guide — illustration layer research

Primary-source research for gymBackend exercise catalog illustration gap (ADR-0007 deferred).
**Date:** 2026-09-07. **Package version:** `1.0.0`.

**Decision context:** ADR-0007 accepted a 30-row owned `exercise_items` seed and explicitly deferred
"secondary muscles, demo assets." This note evaluates `@bryllim/workout-guide` as a lawful, open
illustration source for those missing pose frames — **not** as a replacement store.

Official sources used: [GitHub repository](https://github.com/bryllim/workout-guide),
[npm package](https://www.npmjs.com/package/@bryllim/workout-guide),
[integration guide](https://bryllim.github.io/workout-guide/guide/),
[LICENSES.md](https://github.com/bryllim/workout-guide/blob/main/LICENSES.md),
[ATTRIBUTION.md](https://github.com/bryllim/workout-guide/blob/main/ATTRIBUTION.md),
[CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode),
[CC ShareAlike interpretation wiki](https://wiki.creativecommons.org/wiki/CC_SA_4.0).
Package manifest inspected at
`https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/manifest.json` (302 entries, 437 KB).

---

## 1. What the package is

| Attribute | Value |
|---|---|
| npm name | `@bryllim/workout-guide` |
| Current version | `1.0.0` |
| Author | Bryl Lim (`bryllim.com`) |
| Base artwork | Everkinetic (`github.com/everkinetic/data`) — 76 first-pose frames vector-traced / recoloured |
| Total exercises | **302** |
| Frames per exercise | **3** (start, mid, end pose) |
| Total assets | **906** transparent 512 × 512 SVG/PNG files |
| Delivery options | npm package path · pinned jsDelivr CDN · Expo `require()` |
| Code license | MIT |
| Visual asset license | **CC BY-SA 4.0** |

### API surface (source: `packages/workout-guide/src/index.ts`)

```ts
exercises: Exercise[]              // full manifest array
getExercise(idOrSlug: string)      // Exercise | null
searchExercises(query, filters)    // Exercise[]  (in-process, no network)
getAssetUrl(idOrSlug, frameIndex, options?) // CDN URL string | null
```

### `Exercise` shape (source: `packages/workout-guide/src/types.ts`)

```ts
type Exercise = {
  id: string;          // e.g. "exercise-bench-press"
  slug: string;        // e.g. "bench-press"
  name: string;        // e.g. "Bench Press"
  exerciseType: 'weight_reps' | 'bodyweight_reps' | 'duration'
               | 'distance_duration' | 'assisted_bodyweight';
  equipment: string;          // human label, NOT our enum
  primaryMuscle: string;      // human label, NOT our enum
  secondaryMuscles: string[];
  isStretch: boolean;
  frames: [ExerciseFrame, ExerciseFrame, ExerciseFrame];
  attribution: ExerciseAttribution;
};
```

### CDN URL pattern

```
https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/<slug>/frame-<1|2|3>.svg
```

Pin the version (`@1.0.0`) — do **not** hotlink `@latest`; that would break on new major versions.

---

## 2. Licensing obligations

Source: [LICENSES.md](https://github.com/bryllim/workout-guide/blob/main/LICENSES.md),
[CC BY-SA 4.0 legal code §3](https://creativecommons.org/licenses/by-sa/4.0/legalcode).

### 2.1 What is allowed

Commercial use, redistribution, and integration into a product (SaaS, mobile app) of **unmodified**
frames is permitted under CC BY-SA 4.0 at no cost.

### 2.2 Attribution — required whenever frames are shared

When frames are served to end-users (API response, mobile UI, web UI) you must include:

- Name of creator(s): **Bryl Lim** and **Everkinetic** (for derived frames).
- A link to the license: `https://creativecommons.org/licenses/by-sa/4.0/`.
- A copyright notice.
- A notice that refers to the license.

The package suggests this credit line (from ATTRIBUTION.md):

> "Original exercise artwork by Everkinetic, expanded by Bryl Lim, licensed under CC BY-SA 4.0."

A single Attribution / About screen in the mobile app, or a `"attribution"` field in the API
response (the package manifest carries per-frame attribution objects), satisfies this requirement.

### 2.3 ShareAlike — when does it apply?

ShareAlike triggers **only if we produce and distribute Adapted Material** (modified artwork).

- Serving **unmodified SVG/PNG frames** from the CDN directly in a native UI = aggregation, not
  adaptation. ShareAlike does not force the gymBackend SaaS under CC BY-SA.
  ([CC wiki: "Simply including an SA work unmodified alongside unrelated materials does not produce
  an adaptation."](https://wiki.creativecommons.org/wiki/CC_SA_4.0))
- If we **recolour, crop, or composite** frames and distribute the result, those adapted images
  must be released under CC BY-SA 4.0 (or a compatible license).

**Practice rule:** use frames as-is from jsDelivr. Do not modify them in the backend or pipeline.

---

## 3. Fit against ADR-0007 and the current gap

ADR-0007 (accepted): [`docs/adr/0007-catalog-exercise.md`](adr/0007-catalog-exercise.md).

> "We do not copy Hevy's library, images, or Workout+Set diary."
> "Secondary muscles, demo assets, and Hevy distance/cardio types are out of this seed."

`@bryllim/workout-guide` does **not** derive from Hevy. It derives from
[Everkinetic](https://github.com/everkinetic/data), which is independently CC BY-SA 4.0 licensed.
Using it does not violate ADR-0007's prohibition on Hevy source material.

ADR-0007 also states lawful sources for copy/media are "original writing/photos, or third-party
datasets whose license allows redistribution." CC BY-SA 4.0 explicitly allows redistribution. This
package is a valid lawful source.

### Gap filled

| Gap (ADR-0007 deferred) | Filled by this package |
|---|---|
| Demo assets / pose frames | Yes — 3 frames per exercise, 512 × 512 |
| Secondary muscles | Yes — `secondaryMuscles: string[]` per exercise |
| `isStretch` tag | Yes — boolean flag |
| Instructions / text form cues | **No** — frames only, no written instructions |
| CustomExercise APIs | **No** — package is a fixed catalog; custom rows need no illustration by default |
| Broader seed (302 vs 30) | **Partial** — 302 exercises exist; curating our enums + measurement for all is a separate project |

---

## 4. Seed ↔ slug mapping (all 30 current `exercise_items`)

`exercise_items.id` column (UUID), seed source:
[`supabase/migrations/20260817121500_seed_exercise_catalog_v1.sql`](../supabase/migrations/20260817121500_seed_exercise_catalog_v1.sql).

Package manifest confirmed: all slugs exist in `@bryllim/workout-guide@1.0.0` unless marked
"close match" — verified by direct JSON inspection of the 302-entry manifest.

| Our name | Our UUID suffix | Package slug | Match type | Package name |
|---|---|---|---|---|
| Bench Press (Barbell) | `…000001` | `bench-press` | Exact | Bench Press |
| Incline Press (Dumbbell) | `…000002` | `incline-dumbbell-press` | Exact | Incline Dumbbell Press |
| Push-up | `…000003` | `push-up` | Exact | Push-up |
| Chest Fly (Machine) | `…000004` | `pec-deck` | Close — same movement, machine | Pec Deck |
| Chest Fly (Cable) | `…000005` | `cable-fly` | Exact | Cable Fly |
| Lat Pulldown (Cable) | `…000006` | `lat-pulldown` | Exact | Lat Pulldown |
| Seated Row (Cable) | `…000007` | `seated-row` | Exact | Seated Cable Row |
| Bent-Over Row (Barbell) | `…000008` | `barbell-row` | Exact | Barbell Row |
| Pull-up | `…000009` | `pull-up` | Exact | Pull-up |
| Assisted Pull-up | `…00000a` | `assisted-pull-up` | Exact | Assisted Pull-up |
| Back Squat (Barbell) | `…00000b` | `squat` | Exact | Squat |
| Leg Press | `…00000c` | `leg-press` | Exact | Leg Press |
| Romanian Deadlift (Barbell) | `…00000d` | `romanian-deadlift` | Exact | Romanian Deadlift |
| Walking Lunge (Dumbbell) | `…00000e` | `walking-lunge` | Exact | Walking Lunge |
| Leg Extension | `…00000f` | `leg-extension` | Exact | Leg Extension |
| Leg Curl (Machine) | `…000010` | `leg-curl` | Exact | Leg Curl |
| Standing Calf Raise | `…000011` | `standing-calf-raise` | Exact | Standing Calf Raise |
| Hip Thrust (Barbell) | `…000012` | `hip-thrust` | Exact | Hip Thrust |
| Overhead Press (Barbell) | `…000013` | `overhead-press` | Exact | Overhead Press |
| Shoulder Press (Dumbbell) | `…000014` | `seated-dumbbell-press` | Close — seated variant | Dumbbell Seated Shoulder Press |
| Lateral Raise (Dumbbell) | `…000015` | `lateral-raise` | Exact | Lateral Raise |
| Bicep Curl (Barbell) | `…000016` | `ez-bar-curl` | Close — no exact barbell curl slug; EZ-bar is nearest form | EZ-Bar Curl |
| Bicep Curl (Dumbbell) | `…000017` | `bicep-curl` | Exact | Bicep Curl |
| Tricep Pushdown (Cable) | `…000018` | `tricep-pushdown` | Exact | Tricep Pushdown |
| Lying Tricep Extension (Barbell) | `…000019` | `skull-crusher` | Exact (common name) | Skull Crusher |
| Plank | `…00001a` | `plank` | Exact | Plank |
| Crunch | `…00001b` | `crunch` | Exact | Crunch |
| Deadlift (Barbell) | `…00001c` | `deadlift` | Exact | Deadlift |
| Face Pull (Cable) | `…00001d` | `face-pull` | Exact | Face Pull |
| Goblet Squat (Dumbbell) | `…00001e` | `goblet-squat` | Exact | Goblet Squat |

**Summary:** 25 exact, 5 close-match. All 30 have a usable illustration; no seed row is unillustrated.

### CDN URL examples

```
# Push-up — frame 1 (start position)
https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/push-up/frame-1.svg

# Bench Press — all 3 frames
https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-1.svg
https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-2.svg
https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-3.svg
```

---

## 5. Enum vocabulary mapping

The package uses free-text string labels. If we ever curate a broader seed from the package
manifest, each row must be mapped to our frozen Postgres enums before insertion.

### 5.1 `primaryMuscle` → `exercise_muscle`

| Package label | Our `exercise_muscle` enum | Notes |
|---|---|---|
| `Chest` | `CHEST` | |
| `Lats` | `LATS` | |
| `Upper Back` | `UPPER_BACK` | |
| `Lower Back` | `LOWER_BACK` | |
| `Shoulders` | `SHOULDERS` | |
| `Rear Delts` | `SHOULDERS` | Rear delt isolation — nearest enum |
| `Biceps` | `BICEPS` | |
| `Triceps` | `TRICEPS` | |
| `Quads` | `QUADS` | |
| `Hamstrings` | `HAMSTRINGS` | |
| `Glutes` | `GLUTES` | |
| `Calves` | `CALVES` | |
| `Core` | `CORE` | |
| `Posterior Chain` | `FULL_BODY` | Compound posterior — nearest enum |
| `Back` | `UPPER_BACK` | Ambiguous; default to `UPPER_BACK`, review per movement |
| `Legs` | `QUADS` | Ambiguous; default to `QUADS`, review per movement |
| `Adductors` | `OTHER` | No enum for adductors |
| `Forearms` | `OTHER` | No enum for forearms |
| `Hips` | `GLUTES` | Hip-dominant movements — nearest enum |
| `Mobility` | `OTHER` | Stretch/mobility exercises |

### 5.2 `equipment` → `exercise_equipment`

| Package label | Our `exercise_equipment` enum | Notes |
|---|---|---|
| `Barbell` | `BARBELL` | |
| `Dumbbell` | `DUMBBELL` | |
| `Machine` | `MACHINE` | |
| `Cable` | `CABLE` | |
| `Bodyweight` | `BODYWEIGHT` | |
| `Kettlebell` | `KETTLEBELL` | |
| `Resistance Band` | `BAND` | |
| `Pull-up Bar` | `BODYWEIGHT` | Treat as bodyweight movement |
| `Plate` | `OTHER` | Plate-loaded movements without a barbell |
| `Bench` | `OTHER` | Bench alone (e.g. step-ups) |
| `Box` | `OTHER` | Box jumps etc. |
| `Stability Ball` | `OTHER` | |
| `Chair` / `Doorway` / `Towel` / `Wall` | `OTHER` | Home/stretch equipment |
| `Cardio` | `OTHER` | Machine type, not exercise equipment in our model |

### 5.3 `exerciseType` → `exercise_measurement`

| Package label | Our `exercise_measurement` enum | Notes |
|---|---|---|
| `weight_reps` | `WEIGHT_REPS` | |
| `bodyweight_reps` | `REPS_ONLY` | |
| `duration` | `DURATION` | |
| `assisted_bodyweight` | `BODYWEIGHT_ASSISTED` | |
| `distance_duration` | `DURATION` | No distance enum; use `DURATION`; review cardio rows individually |

---

## 6. Recommended integration shape

**Principle:** the package is an **illustration lookup layer** over our owned catalog — not a
replacement store. `exercise_items` UUIDs remain the source of record. The mobile client uses slug
to resolve CDN frames. The backend may optionally return slug in the search DTO.

### 6.1 Schema addition (one nullable column)

```sql
-- Forward-only migration on exercise_items
ALTER TABLE public.exercise_items
  ADD COLUMN illustration_slug varchar(120) NULL;

-- Update the 30 seed rows with the curated slug map above
UPDATE public.exercise_items SET illustration_slug = 'bench-press'
  WHERE id = 'e0e00000-0000-4000-8000-000000000001';
-- … (one UPDATE per row)
```

`illustration_slug` is nullable so CustomExercise rows and any future un-illustrated seeds do not
break. No FK — the slug is a lookup key against a CDN pattern, not a DB relation.

### 6.2 Domain / DTO extension

Add `illustrationSlug: string | null` to `ExerciseSearchHit` (domain read model) and extend
`toExerciseSearchDto` to include it. Clients build CDN URLs client-side using the slug and the
pinned version constant.

Alternatively, the backend can build the three frame URLs in the Infrastructure mapper and return
them directly:

```ts
illustration: slug
  ? {
      frames: [1, 2, 3].map(
        (n) =>
          `https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/${slug}/frame-${n}.svg`,
      ),
      attribution:
        'Exercise artwork by Everkinetic & Bryl Lim, CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/',
    }
  : null,
```

The attribution string satisfies CC BY-SA obligations inline in the API response.

### 6.3 Where the npm package belongs (if installed)

If `@bryllim/workout-guide` is installed (e.g. for seed scripts or slug-validation tooling):

- **Seed scripts** only — use `getExercise(slug)` to validate a slug is real before inserting.
- **Infrastructure adapters** only — never import into Domain or Application layers (dependency
  rule; SDK must not leak into inner layers).
- **Mobile clients** — can use the package's `getAssetUrl` helper or direct `require()` for
  offline-capable asset bundles (Expo integration guide applies).

The package does **not** need to be a runtime server dependency. CDN URLs are deterministic strings
from the slug + version — no SDK call needed at request time.

### 6.4 Broader seed expansion (out of this note's scope)

The package's 302 exercises can serve as a **reference list** for curating new `exercise_items`
rows. The workflow is:

1. Pick movements from the manifest that match an Indian commercial gym context.
2. Write our own `name`, `aliases`, `primary_muscle`, `equipment`, `measurement` enum values.
3. Set `illustration_slug` to the package slug.
4. Insert via a new forward-only SQL migration.

This is distinct from bulk-importing the package catalog directly (which would bypass our enum
constraints and `exercise_items` naming conventions).

---

## 7. Non-goals — do not do

| What | Why not |
|---|---|
| Replace `exercise_items` with the package catalog | Violates ADR-0007 "no third-party as the store"; breaks typed identity + measurement enums |
| Call `searchExercises()` at request time as the search backend | Wrong SoR; our IDs would differ from package IDs; catalog ownership lost |
| Import package into Domain or Application layers | Breaks dependency rule — SDK/CDN details must stay in Infrastructure |
| Hotlink floating `@latest` CDN version | URL breaks on new major release; pin `@1.0.0` |
| Modify / recolour frames and redistribute | Triggers ShareAlike; only use unmodified frames |
| Use as instruction / form-cue text source | Package has no written instructions; frames are visual only |
| Treat as a comprehensive catalog immediately | 302 exercises covers common movements well but our enums + naming still need per-row review for new rows |

---

## 8. Scheduling

This work is **not** Next up. Current next stint is **3.5 notifications + scheduled jobs**.

Implementation order when product wants media on the exercise catalog:

1. Write migration: `ALTER TABLE exercise_items ADD COLUMN illustration_slug varchar(120) NULL`.
2. Write UPDATE statements for all 30 seed rows using the table in §4.
3. Extend `ExerciseSearchHit` + `toExerciseSearchDto` with `illustrationSlug`.
4. Extend Infrastructure mapper to build `illustration` object (frame URLs + attribution string).
5. Add attribution line to API docs and app About screen.
6. Optional: install `@bryllim/workout-guide` as a dev/seed dependency for slug validation tooling.

No ADR amendment needed — this is a deferred implementation of ADR-0007's own "demo assets"
deferral. If broader seed expansion (> 30 rows) is pursued, write a new ADR or ADR-0007 addendum
covering the curation process and enum-mapping decisions.
