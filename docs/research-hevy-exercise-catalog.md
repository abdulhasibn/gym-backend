# Hevy exercise catalog vs logged workouts

Primary-source research for gymBackend stint 3.2+ (exercise catalog analog).
**Date:** 2026-08-17. **Hevy API spec version:** `0.0.1` (OpenAPI 3.0).

**Decision:** accepted as [ADR-0007](adr/0007-catalog-exercise.md) — owned 30-row seed, not a Hevy/wger dump. Completions stay `PlanCompletion`.

Official sources used: [Hevy API Docs](https://api.hevyapp.com/docs), OpenAPI embedded in that Swagger UI (`https://api.hevyapp.com/docs/swagger-ui-init.js`), [hevyapp.com](https://www.hevyapp.com), feature / legal pages, and [Hevy Help Centre](https://help.hevyapp.com) article URLs (help pages were Cloudflare-gated on fetch; titles and quoted copy below are from those official URLs / their indexed text).

This note describes **structure**, **public enums**, and **what we must not copy**. It is not a license to reuse Hevy’s catalog titles, images, animations, or instructions.

---

## 1. Layered model (catalog ≠ plan ≠ log)

Hevy splits four (plus one grouping) concepts. Official product copy and the public API agree on the split; they disagree only on naming of the *plan* layer (app: “Routine”; gymBackend analog: assigned `WorkoutPlan`).

| Layer | Hevy name | What it is | Identity on the public API |
|---|---|---|---|
| Catalog template | Exercise / ExerciseTemplate | Reusable movement definition (built-in or user-created). Referenced by id from plans and logs. | `ExerciseTemplate` |
| Prescribed plan | Routine | Saved template of a *session*: ordered exercises, target sets, rest, notes. Reusable. Starting it becomes a workout. | `Routine` (+ `RoutineFolder`) |
| Logged session | Workout | One completed (or in-progress) gym session with start/end time and logged sets. May point at the routine it came from. | `Workout` |
| Logged / prescribed set | Set | One row of measurement under an exercise on a routine or workout. | `Set` / request `*Set` schemas |
| Plan grouping | Routine folder | Named group of routines (default “My Routines”). | `RoutineFolder` |

**Product definitions (not API):**

- “A routine is a plan for a workout… saved in the routine section… to complete at any time.” “A workout is when you are actively logging what you are doing at the gym.” ([Help: Workouts vs Routines](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them))
- “A gym routine on Hevy is a workout you create once and use as many times as you want.” ([Create Folders and Gym Routines](https://www.hevyapp.com/features/gym-routines/))
- “A routine is a reusable workout template… In contrast, a live workout is a session you log while at the gym or elsewhere.” ([Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/))
- Starting a routine copies it into a live workout; empty workouts are allowed; finishing saves the session to the profile. ([Workouts vs Routines](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them), [Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/))

**API definitions:**

- `Workout.routine_id` — “The ID of the routine that this workout belongs to.” Session → plan link, optional in the sense the schema does not mark it required. ([API Docs](https://api.hevyapp.com/docs) schema `Workout`)
- Every routine/workout **exercise line** carries `exercise_template_id` — “The id of the exercise template. This can be used to fetch the exercise template.” ([API Docs](https://api.hevyapp.com/docs) schemas `Exercise`, `Routine.exercises[]`)
- POST workout / POST routine exercise bodies send **only** `exercise_template_id` (plus notes / superset / sets) — they do not send a free-text exercise name. ([API Docs](https://api.hevyapp.com/docs) `PostWorkoutsRequestExercise`, `PostRoutinesRequestExercise`)
- History is keyed by template, not by workout title: `GET /v1/exercise_history/{exerciseTemplateId}`. ([API Docs](https://api.hevyapp.com/docs))

So: **catalog identity lives on ExerciseTemplate; routines and workouts are bags of references to that catalog plus per-set measurements.**

---

## 2. Access, auth, Pro, ToS

### Public API

From the OpenAPI `info.description` at [api.hevyapp.com/docs](https://api.hevyapp.com/docs):

- Public API, “just starting to roll this out”; **no stability guarantee** (“we make no guarantees that we won't completely change the structure or abandon the project entirely”).
- **“Currently, this API is only available to Hevy Pro users.”**
- Key origin: `https://hevy.com/settings?developer`.
- Contact: `pavel@hevyapp.com`.
- Spec version `0.0.1`.

Auth on every documented path: required header `api-key` (`string`, `format: uuid`). ([API Docs](https://api.hevyapp.com/docs) parameters)

There is **no documented OAuth / user-consent flow**. There is **no documented bulk-export of the built-in catalog for third-party products**. `GET /v1/exercise_templates` is “a paginated list of exercise templates **available on the account**” (Pro key-holder’s mix of built-in + custom), `pageSize` max **100**. ([API Docs](https://api.hevyapp.com/docs) `GET /v1/exercise_templates`)

### Product Pro limits (custom / routines; not the built-in catalog)

Help Centre Pro table ([Hevy Pro Subscription](https://help.hevyapp.com/hc/en-us/articles/35119778922263-Hevy-Pro-Subscription-How-to-get-Pro-and-What-Does-It-Include)):

| Feature | Free | Pro |
|---|---|---|
| Routine limit | 4 | Unlimited |
| Data history | 3 months | All time |
| Custom exercises | 7 | Unlimited |
| Warm up Calculator | Unavailable | Available |

Marketing copy matches the custom-exercise cap: free **seven**; paid unlimited. ([Exercise Library](https://www.hevyapp.com/features/exercise-library/))

API POST create-custom returns **403** with example error `"exceeds-custom-exercise-limit"`. ([API Docs](https://api.hevyapp.com/docs) `POST /v1/exercise_templates`)

The public API being Pro-only is **API-docs text**, not the Help Centre Pro table (that table does not mention the developer key).

### Terms of use (do not copy the catalog)

[Terms and Conditions](https://www.hevyapp.com/legal/terms-and-conditions/) (effective 23 June 2019; owner Hevy Studios S.L.):

- Cover `www.hevyapp.com`, `www.hevy.com`, and the Application “Hevy”.
- **Intellectual Property:** “all content presented to you on this Application is protected by copyrights, trademarks… and is the sole property of Hevy.”
- “Except for a single copy made for personal use only, you may not copy, reproduce, modify, republish, upload, post, transmit, or distribute any documents or information from this Application in any form or by any means without prior written permission…”
- Conduct: no content that “Infringes on any patent, trademark, trade secret, copyright…”
- The Application is licensed as a **limited, non-exclusive, nontransferable** use license; provided “as is”.
- Unauthorized / suspected unauthorized use may lead to account termination.

**Implication:** pulling Hevy exercise **titles, animations, photos, GIFs, or instructional copy** into gymBackend (scraping the app, or dumping `GET /v1/exercise_templates` titles into our seed) is copying Application content. Do not do it. Using Hevy’s **published enum tokens** (muscle / equipment / measurement *types*) as a *shape* for our own original catalog is modeling, not cloning their library.

---

## 3. ExerciseTemplate (catalog)

### Product library

[Exercise Library](https://www.hevyapp.com/features/exercise-library/) and [Custom Exercises](https://www.hevyapp.com/features/custom-exercises/):

- Search + filters for **equipment** and **muscle targets**.
- Built-in entries also present **in-app** (not on the `ExerciseTemplate` API schema): demonstrational animation, performance over time (heaviest weight, projected 1RM, best set & session volume, total reps), workout-to-workout history, step-by-step setup/execution instructions.

Those presentation fields are **undocumented on `ExerciseTemplate`**. Do not invent them as required Hevy catalog columns.

### API schema `ExerciseTemplate`

From [API Docs](https://api.hevyapp.com/docs) `components.schemas.ExerciseTemplate`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Example in this schema is a UUID; other examples in the spec use 8-char hex (`"D04AC939"`, `"05293BCA"`). Spec does not freeze the id format. |
| `title` | string | Example `"Bench Press (Barbell)"` — **Hevy’s title string; do not copy into our seed.** |
| `type` | string | Example `"weight_reps"`. **Not an enum on this schema** (unlike create). |
| `primary_muscle_group` | string | Example `"chest"`. Not `$ref`’d to `MuscleGroup` on the read model. |
| `secondary_muscle_groups` | string[] | Secondary muscles. |
| `equipment_category` | `EquipmentCategory` | Enum, see §6. |
| `is_custom` | boolean | Custom vs built-in. Example `false`. |

`GET /v1/exercise_templates` — paginated `{ page, page_count, exercise_templates[] }`.
`GET /v1/exercise_templates/{exerciseTemplateId}` — single template; **404** if missing.

**Not in this schema:** image/video/GIF, instructions, animation URL, 1RM, notes, owner user id, gym id.

### Official catalog size

- Product / help say **“400+”** high-quality exercises, not an exact integer. ([Exercise Library](https://www.hevyapp.com/features/exercise-library/), [Custom Exercises](https://www.hevyapp.com/features/custom-exercises/), [Exercise Programming Options](https://www.hevyapp.com/features/exercise-programming-options/), [Help: Exercise Library 400+](https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises))
- The public API **does not document** a total built-in count.
- **Exact built-in catalog size: unknown.** Do not treat “400+” as 400, and do not fill the gap from Reddit or unofficial clients.

---

## 4. Custom exercises (user-created templates)

Custom exercises **are still ExerciseTemplates** with `is_custom: true`. They sit in the same library and are added to routines/workouts the same way. ([Exercise Library](https://www.hevyapp.com/features/exercise-library/), [Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/))

### App UI (product)

[Custom Exercises](https://www.hevyapp.com/features/custom-exercises/) and Help [Build a Workout Program](https://help.hevyapp.com/hc/en-us/articles/34953606698903-Build-a-Workout-Program-Create-Organize-Routines):

Create path (product): Profile → Exercises → Create. Fields:

- Image (also: duplicate a library item and swap photo / video / GIF)
- Name
- Required equipment (if any)
- Primary muscle target
- Secondary muscle targets
- Exercise type (weight & reps, bodyweight reps, duration, …)

Also documented: duplicate an existing library exercise into a custom one; edit; delete. Free cap 7 / Pro unlimited (see §2). Custom exercises appear in a list after Recent Exercises. ([Custom Exercises](https://www.hevyapp.com/features/custom-exercises/))

### API create

`POST /v1/exercise_templates` — “Create a new custom exercise template.” ([API Docs](https://api.hevyapp.com/docs))

Request schema `CreateCustomExerciseRequestBody`:

```json
{
  "exercise": {
    "title": "string",
    "exercise_type": "<CustomExerciseType>",
    "equipment_category": "<EquipmentCategory>",
    "muscle_group": "<MuscleGroup>",
    "other_muscles": ["<MuscleGroup>", "..."]
  }
}
```

Responses:

- **200** `{ "id": <integer> }` (example `123`) — note: **integer here vs string `ExerciseTemplate.id`**. Spec inconsistency; do not assume one format.
- **400** invalid body
- **403** `"exceeds-custom-exercise-limit"`

**Read vs write field names (official spec, both exist):**

| Read (`ExerciseTemplate`) | Create body |
|---|---|
| `type` | `exercise_type` |
| `primary_muscle_group` | `muscle_group` |
| `secondary_muscle_groups` | `other_muscles` |

The spec does **not** document PATCH/DELETE for templates (product UI does edit/delete). The spec does **not** include an image field on create (product UI does). Treat image as **app-only** unless/until the API documents it.

---

## 5. Routine, Workout, Set

### Routine (prescribed plan)

Product: name; exercises from the library; sets; set types; load + reps or **rep range**; duration; rest between sets; optional superset; per-exercise notes (repeat every time the routine is started); folders. ([Gym Routines](https://www.hevyapp.com/features/gym-routines/), [Exercise Programming Options](https://www.hevyapp.com/features/exercise-programming-options/), [Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/))

API `Routine` ([API Docs](https://api.hevyapp.com/docs)):

| Field | Notes |
|---|---|
| `id` | string (UUID example) |
| `title` | |
| `folder_id` | number, nullable. POST: `null` → default **“My Routines”** folder |
| `created_at` / `updated_at` | ISO 8601 |
| `exercises[]` | see below |

Each routine exercise:

- `index`, `title` (denormalized), `rest_seconds` (schema type **string**, example `"60"`), `notes`, `exercise_template_id`, `supersets_id` (nullable; null = not in a superset)
- `sets[]`: `index`, `type`, `weight_kg`, `reps`, `rep_range.{start,end}`, `distance_meters`, `duration_seconds`, `rpe`, `custom_metric`

Endpoints: `GET/POST /v1/routines`, `GET/PUT /v1/routines/{routineId}`. Pagination `pageSize` max **10**. ([API Docs](https://api.hevyapp.com/docs))

`POST /v1/routine_folders` creates a folder “at index 0”; other indexes increment. ([API Docs](https://api.hevyapp.com/docs))

**RPE on routines vs workouts (product):** RPE is **not** available while building a routine; it can be logged on a live workout after enabling Settings → Workouts → RPE Tracking. Duration exercises (e.g. plank) have no RPE column. ([Exercise Programming Options](https://www.hevyapp.com/features/exercise-programming-options/), [Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/))

API nuance: POST **routine** set has `rep_range`, no `rpe`. POST **workout** set has `rpe` (enum), no `rep_range`. GET `Routine` nested sets *do* list `rpe`. GET `Workout` nested sets have no `rep_range`. ([API Docs](https://api.hevyapp.com/docs))

### Workout (logged session)

Product: start from a routine **or** “Start Empty Workout”; stopwatch; mark sets complete; may add/remove/swap exercises; finish screen (title, duration, start date/time, photos, note, private flag). After save, Hevy may ask whether to update the original routine. ([Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/), [Gym Routines](https://www.hevyapp.com/features/gym-routines/))

API `Workout` ([API Docs](https://api.hevyapp.com/docs)):

| Field | Notes |
|---|---|
| `id` | string |
| `title` | |
| `routine_id` | routine this workout belongs to |
| `description` | |
| `start_time` / `end_time` | ISO 8601 |
| `created_at` / `updated_at` | ISO 8601 |
| `exercises[]` | `index`, `title`, `notes`, `exercise_template_id`, `supersets_id`, `sets[]` |

POST create workout also has `is_private` (boolean). Endpoints: list, create, count, events (updates/deletes since a date), get by id, PUT update. Workout list `pageSize` max **10**. ([API Docs](https://api.hevyapp.com/docs))

`GET /v1/workouts/events` — “keep their local cache of workouts up to date without having to fetch the entire list.” ([API Docs](https://api.hevyapp.com/docs))

Logged workout exercise notes are **session-only**; routine notes recur. ([Exercise Programming Options](https://www.hevyapp.com/features/exercise-programming-options/))

### Set

**Set type (official enum on POST bodies):** `warmup` | `normal` | `failure` | `dropset`. ([API Docs](https://api.hevyapp.com/docs) `PostWorkoutsRequestSet.type`, `PostRoutinesRequestSet.type`)

Product labels: Warm Up Set, Normal Set, Failure Set, Drop Set; default is Normal. ([Exercise Programming Options](https://www.hevyapp.com/features/exercise-programming-options/))

**Per-set measurements (workout/routine sets, API):**

| Field | Meaning |
|---|---|
| `index` | Order in the exercise |
| `type` | Set type (above) |
| `weight_kg` | nullable |
| `reps` | nullable |
| `distance_meters` | nullable |
| `duration_seconds` | nullable |
| `rpe` | nullable; POST workout enum: `6, 7, 7.5, 8, 8.5, 9, 9.5, 10` |
| `custom_metric` | nullable; “Currently used for steps and floors” / “stair machine exercises” |
| `rep_range` | routine (and PUT routine) only: `{ start, end }` |

Which of `weight_kg` / `reps` / `distance_meters` / `duration_seconds` / `custom_metric` is *required* is **not** expressed as per-`exercise_type` constraints in the spec. Measurement *intent* is documented on catalog `type` / `CustomExerciseType` and product “exercise type” copy (§6).

---

## 6. Official enums

All lists in this section are copied from [API Docs](https://api.hevyapp.com/docs) `components.schemas` unless labelled “product-only”.

### `MuscleGroup` (20)

`abdominals`, `shoulders`, `biceps`, `triceps`, `forearms`, `quadriceps`, `hamstrings`, `calves`, `glutes`, `abductors`, `adductors`, `lats`, `upper_back`, `traps`, `lower_back`, `chest`, `cardio`, `neck`, `full_body`, `other`

Product: one **primary** + **multiple secondary**. Example given: primary chest, secondaries abs / shoulders / triceps. ([Custom Exercises](https://www.hevyapp.com/features/custom-exercises/)) Product does not publish this 20-token list; the API does.

### `EquipmentCategory` (9)

`none`, `barbell`, `dumbbell`, `kettlebell`, `machine`, `plate`, `resistance_band`, `suspension`, `other`

Product FAQ wording: barbells, dumbbells, kettlebells, gym machines, weight plates, resistance bands, suspension kits, or no equipment. ([Custom Exercises](https://www.hevyapp.com/features/custom-exercises/)) That maps cleanly to the eight named API values **except** API also has `other`, which the FAQ does not mention.

### `CustomExerciseType` (8) — API, **custom create only**

`weight_reps`, `reps_only`, `bodyweight_reps`, `bodyweight_assisted_reps`, `duration`, `weight_duration`, `distance_duration`, `short_distance_weight`

`ExerciseTemplate.type` on **read** is a free string with example `weight_reps`. Built-in templates might use additional type strings; the spec does **not** enumerate them. `custom_metric` copy implies stair-machine **steps/floors** exist on some built-ins, without an extra `CustomExerciseType` value. ([API Docs](https://api.hevyapp.com/docs) `Set.custom_metric`, `PostWorkoutsRequestSet.custom_metric`)

### Product “exercise types” (labels, not API tokens)

[Custom Exercises](https://www.hevyapp.com/features/custom-exercises/) FAQ — eight product labels with examples:

| Product label | Example in that FAQ |
|---|---|
| weight & reps | bench press |
| bodyweight reps | pull-ups |
| weighted bodyweight | weighted dips |
| assisted bodyweight | assisted pull-ups |
| duration | plank |
| duration & weight | weighed wall sit |
| distance & duration | rowing |
| weight & distance | suitcase carry |

Do **not** assert a 1:1 map to `CustomExerciseType`. The API list includes `reps_only` (not named in that FAQ); the FAQ includes “weighted bodyweight” (no identical API token). Official docs do not publish the mapping.

### Set type

`warmup`, `normal`, `failure`, `dropset` — see §5.

### POST workout RPE

`6`, `7`, `7.5`, `8`, `8.5`, `9`, `9.5`, `10` (plus JSON `null`). ([API Docs](https://api.hevyapp.com/docs) `PostWorkoutsRequestSet.rpe`)

---

## 7. What would we need to generate a *similar system* (without Hevy’s catalog)

**Need the architecture, not the rows.**

1. **A catalog entity** with identity, title, measurement type, primary muscle, secondary muscles, equipment, and a custom/built-in flag — matching documented `ExerciseTemplate` fields only.
2. **Prescription** that stores **catalog ids** + target sets (routine), not free-text names.
3. **A log** that is a **session** with start/end and per-set actuals, optionally linked to the prescription (`routine_id`).
4. **User-created catalog rows** sharing the same table (`is_custom` / `source=manual`), with an optional cap.
5. **Our own seed content**: original titles, no Hevy images/animations/instructions. Size is our product choice (Hevy’s exact count is unknown; “400+” is marketing, not a target we should match).
6. Lawful sources for later copy/media: original writing/photos, or third-party datasets whose license **allows** redistribution. Hevy itself is not such a source. ([Terms](https://www.hevyapp.com/legal/terms-and-conditions/))

**Must not:**

- Scrape Hevy (app, web, or API) to populate gymBackend titles/images.
- Redistribute API dump of `exercise_templates` as our “bootstrap catalog”.
- Treat unofficial GitHub clients, Reddit counts, or extra type strings they claim (`floors_duration`, …) as Hevy facts.

**May:**

- Reuse the *idea* of type / muscle / equipment enums (standard gym taxonomy; official tokens listed in §6).
- Ship a small original seed first (same pattern as the 20-food bootstrap).

---

## 8. Spec / product gaps (do not invent)

| Topic | Official status |
|---|---|
| Exact built-in exercise count | Unknown; “400+” only |
| Built-in-only `type` values beyond `CustomExerciseType` | Undocumented (stairs mentioned only via `custom_metric`) |
| Mapping product labels ↔ API `CustomExerciseType` | Undocumented |
| Template image on API | Undocumented (app has it) |
| Template update/delete API | Undocumented (app has edit/delete) |
| Per-type which set fields are required | Undocumented |
| Template `id` format (UUID vs hex vs POST integer) | Inconsistent examples in the spec |
| Public catalog dump / redistribution | Not offered; ToS forbids copying Application content |

---

## Sources

| Source | URL |
|---|---|
| Hevy public API (Swagger) | https://api.hevyapp.com/docs |
| Embedded OpenAPI (`swaggerDoc`, v0.0.1) | https://api.hevyapp.com/docs/swagger-ui-init.js |
| Site home | https://www.hevyapp.com |
| Exercise library | https://www.hevyapp.com/features/exercise-library/ |
| Custom exercises | https://www.hevyapp.com/features/custom-exercises/ |
| Routines / folders | https://www.hevyapp.com/features/gym-routines/ |
| Log workouts | https://www.hevyapp.com/features/track-workouts/ |
| Programming options (sets, RPE, notes) | https://www.hevyapp.com/features/exercise-programming-options/ |
| Terms | https://www.hevyapp.com/legal/terms-and-conditions/ |
| Privacy policy hub | https://www.hevyapp.com/legal/privacy-policy/ |
| API key settings (linked from API docs; page fetch failed 500 here) | https://hevy.com/settings?developer |
| Help: Workouts vs Routines | https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them |
| Help: Build a workout program / custom exercises | https://help.hevyapp.com/hc/en-us/articles/34953606698903-Build-a-Workout-Program-Create-Organize-Routines |
| Help: Pro limits | https://help.hevyapp.com/hc/en-us/articles/35119778922263-Hevy-Pro-Subscription-How-to-get-Pro-and-What-Does-It-Include |
| Help: Library 400+ | https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises |
| Hevy blog (no public-API catalog-size post used) | https://www.hevyapp.com/blog/ |

---

## Implication for gymBackend

Accepted in [ADR-0007](adr/0007-catalog-exercise.md). Plan lines are `exercise_item_id` (never a typed name). Completions stay `PlanCompletion` — Hevy Workout + Set logging is out of 3.2. Seed is 30 original Indian-gym titles (`20260817121500_seed_exercise_catalog_v1.sql`); CustomExercise APIs deferred. **Do not** scrape Hevy or import `GET /v1/exercise_templates`.

| Our `ExerciseItem` (ADR-0007) | Hevy field this mirrors |
|---|---|
| `id` | `ExerciseTemplate.id` (our UUID) |
| `name` | `title` — **our** titles, never Hevy’s library strings |
| `measurement` | `type` / `exercise_type` — collapsed to four values |
| `primary_muscle` | `primary_muscle_group` — our 15-value enum, not Hevy’s 20 tokens |
| (deferred) | `secondary_muscle_groups` |
| `equipment` | `equipment_category` — includes first-class `CABLE` |
| `source` + owner cols | `is_custom` — same seed/manual pattern as `FoodItem` |

Do not add animation URL, form-cue copy, 1RM, or images as “Hevy columns.” Hevy documents those in the app, not on the public `ExerciseTemplate` schema.
