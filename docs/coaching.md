# Coaching workouts (3.2 + templates + schedule + completion window)

Search the platform exercise catalog, manage gym **workout plan templates**, assign a Client-owned **date-based workout schedule**, and tick prescribed schedule lines within the **`[D, D+2]`** gym-local window. Completions are `PlanCompletion` rows — **not** set logs. **No CustomExercise**.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**ADR:** [`adr/0007-catalog-exercise.md`](adr/0007-catalog-exercise.md) · [`adr/0009-gym-workout-plan-templates.md`](adr/0009-gym-workout-plan-templates.md) · [`adr/0010-workout-schedule.md`](adr/0010-workout-schedule.md) · [`adr/0011-workout-completion-window.md`](adr/0011-workout-completion-window.md) · [`adr/0012-workout-streak.md`](adr/0012-workout-streak.md)

Diet plans and gym diet templates remain in [`nutrition.md`](nutrition.md) (unchanged).

Auth: `Authorization: Bearer <accessToken>`. Errors: `{ "error": { "code", "message" } }`.

Requires in-date `TRAINER_COACHING` addon to upsert or complete. Assigned Trainer, or Admin-as-Trainer (live trainer profile). **`WORKOUT_PLANS` grant is not required** to author or read the schedule **definition**; it gates staff **adherence** fields (`completed`, `dayDone`, `adherencePercent`).

Seed catalog is **324 movements** (30 bootstrap + 294 from `@bryllim/workout-guide@1.0.0`, CC BY-SA 4.0). Example id: `e0e00000-0000-4000-8000-000000000001` (Barbell Bench Press).

The legacy dayLabel `WorkoutPlan` assign/GET/complete HTTP surface is **retired** (tables may remain unused).

---

## Search catalog

`GET /exercises/search?q=`

Any authenticated user. Seed catalog only. Empty `q` returns the bootstrap list (capped at 20).

**200:** `{ "exercises": [ { id, name, aliases, primaryMuscle, equipment, measurement, illustration } ] }`

`primaryMuscle` / `equipment` / `measurement` are the frozen catalog enums (ADR-0007).

`illustration` is `null` if no image is mapped; otherwise `{ frames: [url1, url2, url3], attribution }` — three sequential 512×512 PNG pose frames served from pinned jsDelivr CDN (`@bryllim/workout-guide@1.0.0`). Attribution text must be displayed per CC BY-SA 4.0.

---

## Upsert schedule

`PUT /gym-orgs/:gymOrgId/clients/:clientUserId/workout-schedule`

Idempotent replace of the **listed dates only**. Each TRAINING slot snapshots title + exercises from a live gym template (`templateId` only — no exercise body on assign). Soft-deleted templates cannot be assigned; already-snapshotted sessions stay.

```json
{
  "entries": [
    { "date": "2026-09-02", "kind": "REST" },
    {
      "date": "2026-09-03",
      "kind": "TRAINING",
      "morningTemplateId": "<uuid>",
      "eveningTemplateId": "<uuid>"
    },
    {
      "date": "2026-09-04",
      "kind": "TRAINING",
      "morningTemplateId": "<uuid>"
    }
  ]
}
```

- `TRAINING` — at least one of `morningTemplateId` / `eveningTemplateId`
- `REST` — whole day; no template ids; no sessions
- Slots — `MORNING` | `EVENING` only (same or different templates allowed)

**200:** `{ "days": [ … ] }` · **409** `COACHING_ADDON_REQUIRED` · **404** missing membership or template · **422** `INVALID_WORKOUT_SCHEDULE`

Each day in `days` carries:

- `scheduleDate` — always `YYYY-MM-DD` (not an ISO datetime)
- `morningTemplateId` — uuid of the MORNING session's source template, or `null`
- `eveningTemplateId` — uuid of the EVENING session's source template, or `null`
- `sessions[].clonedFromTemplateId` — same template uuid per session (redundant but preserved)

---

## Staff get schedule

`GET /gym-orgs/:gymOrgId/clients/:clientUserId/workout-schedule?from=&to=`

Optional sugar: `?date=` (single day). Max range **62** days. Trainer must be the assigned trainer (or Admin-as-Trainer).

**Definition** always returned. **Adherence** (`completed` / `dayDone` / `adherencePercent`) only when the client has granted `WORKOUT_PLANS` at this gym.

Unscheduled calendar dates are **omitted** from `days` (sparse); only dates with live rows are returned.

**200:** `{ "days": [ … ] }` — same day shape as PUT response above (with exercise `name` added from catalog join)

---

## Client my schedule

`GET /gym-orgs/:gymOrgId/my-workout-schedule?from=&to=`  
`GET /gym-orgs/:gymOrgId/my-workout-schedule?date=`

`writable` is false after addon expiry (history still returned). Exercises include `completed` for **every** day in range; each day includes `dayDone` and TRAINING `adherencePercent`. REST days have `dayDone: true` and `adherencePercent: null`. Response includes `today` (`YYYY-MM-DD`).

---

## Complete / uncomplete

`POST /gym-orgs/:gymOrgId/my-workout-schedule/items/:itemId/complete`  
`DELETE /gym-orgs/:gymOrgId/my-workout-schedule/items/:itemId/complete`

Writes / deletes a `workout_schedule_exercise_completions` row with **`completed_on = schedule date D`**. Allowed when gym-local today ∈ **`[D, D+2]`** (inclusive); reject future `D` and days past `D+2`. No date body. **204**. Second complete → **409** `ALREADY_COMPLETED_WORKOUT_EXERCISE`. Outside window → **422** `INVALID_WORKOUT_SCHEDULE`. Expired addon → **409** `COACHING_ADDON_REQUIRED`.

---

## Workout streak

`GET /gym-orgs/:gymOrgId/my-workout-streak`  
`GET /gym-orgs/:gymOrgId/clients/:clientUserId/workout-streak`

Compute-on-read from schedule + completions (ADR-0012). Lookback **366** gym-local days.

- **REST** preserves the run (no increment)
- **TRAINING** increments only when `dayDone`
- Unscheduled calendar days **break** the run
- If today is TRAINING and not done, current streak **skips today** (still completable)

Staff requires live **`WORKOUT_PLANS`** (**403** otherwise). Assigning trainer may still read schedule definition without the grant.

**200:**

```json
{
  "asOf": "2026-09-02",
  "currentStreak": 4,
  "longestStreak": 12,
  "lookbackDays": 366
}
```

---

## Gym workout templates (ADR-0009)

Reusable **flat** exercise lists for the gym library. Creating/duplicating does **not** require a client or coaching addon. Assign onto the client calendar via schedule upsert above.

**ACL:** any live Trainer / Admin-as-Trainer at the gym may **list/get/duplicate** all live templates. **Update/delete** = author or Admin only. Duplicate lands in the **duplicator’s** library (`clonedFromId` set).

**List is paginated:** `?limit=` (default 20, max 100) `&offset=` → `{ workoutPlanTemplates: { items, total, limit, offset } }`.

| Method | Path |
|--------|------|
| `POST` | `/gym-orgs/:gymOrgId/workout-plan-templates` |
| `GET` | `/gym-orgs/:gymOrgId/workout-plan-templates?limit=&offset=` |
| `GET` | `/gym-orgs/:gymOrgId/workout-plan-templates/:templateId` |
| `POST` | `/gym-orgs/:gymOrgId/workout-plan-templates/:templateId/duplicate` |
| `PATCH` | `/gym-orgs/:gymOrgId/workout-plan-templates/:templateId` |
| `DELETE` | `/gym-orgs/:gymOrgId/workout-plan-templates/:templateId` |

**Write body (POST / PATCH):**

```json
{
  "title": "Circuit library",
  "notes": null,
  "exercises": [
    {
      "exerciseItemId": "e0e00000-0000-4000-8000-000000000001",
      "sets": 3,
      "reps": "8-12",
      "notes": null
    }
  ]
}
```

**GET / list exercise line** — catalog fields are embedded on the query path (GET / list). Write responses (POST / PATCH / duplicate) are entity-mapped: `illustration` is `null` and catalog fields are absent until the client re-GETs.

```json
{
  "id": "<uuid>",
  "exerciseItemId": "e0e00000-0000-4000-8000-000000000001",
  "name": "Bench Press (Barbell)",
  "primaryMuscle": "CHEST",
  "equipment": "BARBELL",
  "sets": 3,
  "reps": "8-12",
  "notes": null,
  "sortOrder": 0,
  "illustration": {
    "frames": [
      "https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-1.png",
      "https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-2.png",
      "https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-3.png"
    ],
    "attribution": "Exercise artwork by Everkinetic & Bryl Lim — CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)"
  }
}
```
