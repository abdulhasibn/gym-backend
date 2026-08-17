# Coaching workouts (3.2)

Search the platform exercise catalog, assign a Client-owned `WorkoutPlan`, and tick prescribed lines **per gym-local calendar day**. Completions are `PlanCompletion` rows — **not** set logs. **No CustomExercise** and **no gym workout templates**.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**ADR:** [`adr/0007-catalog-exercise.md`](adr/0007-catalog-exercise.md)

Diet plans and gym diet templates remain in [`nutrition.md`](nutrition.md).

Auth: `Authorization: Bearer <accessToken>`. Errors: `{ "error": { "code", "message" } }`.

Requires in-date `TRAINER_COACHING` addon to assign or complete. Assigned Trainer, or Admin-as-Trainer (live trainer profile). **`WORKOUT_PLANS` grant is not required** to author or read the definition (that grant is for later staff adherence).

Seed catalog is 30 movements. Example id: `e0e00000-0000-4000-8000-000000000001` (Barbell Bench Press).

---

## Search catalog

`GET /exercises/search?q=`

Any authenticated user. Seed catalog only. Empty `q` returns the bootstrap list (capped at 20).

**200:** `{ "exercises": [ { id, name, aliases, primaryMuscle, equipment, measurement } ] }`

`primaryMuscle` / `equipment` / `measurement` are the frozen catalog enums (ADR-0007).

---

## Assign

`POST /gym-orgs/:gymOrgId/clients/:clientUserId/workout-plans`

Archives the prior ACTIVE plan for that `(client, gym)`. Lines must be live seed `exerciseItemId`s — never typed names.

```json
{
  "title": "Push Pull Legs",
  "notes": null,
  "days": [
    {
      "dayLabel": "Push",
      "exercises": [
        {
          "exerciseItemId": "e0e00000-0000-4000-8000-000000000001",
          "sets": 3,
          "reps": "8-12",
          "notes": null
        }
      ]
    }
  ]
}
```

- `title` — 1–120 chars after trim
- `days` — min 1; each day needs ≥1 exercise
- `dayLabel` — 1–80 chars after trim
- `sets` — optional integer 1–99
- `reps` — optional prescription string, max 40 (`8-12`, `45s`)

**201:** `{ "workoutPlan": … }` · **409** `COACHING_ADDON_REQUIRED` · **404** missing membership or seed exercise

---

## Staff get definition

`GET /gym-orgs/:gymOrgId/clients/:clientUserId/workout-plans`

**200:** `{ "workoutPlan": … | null }` — definition only (no `completed` flags). Trainer must be the assigned trainer. Query DTO includes catalog `name` on each exercise.

---

## Client my plan

`GET /gym-orgs/:gymOrgId/my-workout-plan`

`writable` is false after addon expiry (history still returned). Exercises include `completed` for gym-local today. `completionDate` is that day (`YYYY-MM-DD`).

---

## Complete / uncomplete

`POST /gym-orgs/:gymOrgId/my-workout-plan/items/:itemId/complete`  
`DELETE /gym-orgs/:gymOrgId/my-workout-plan/items/:itemId/complete`

Writes / deletes a `workout_plan_exercise_completions` row for **gym-local today**. No date body. **204**. Second complete → **409** `ALREADY_COMPLETED_WORKOUT_EXERCISE`. Expired addon → **409** `COACHING_ADDON_REQUIRED`.
