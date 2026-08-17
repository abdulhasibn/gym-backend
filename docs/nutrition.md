# Nutrition catalog + calorie diary (3.1)

Seed catalog search, extras diary, and (with coaching) complete-prescribed into the same diary. **No CustomFood** — only `source=seed` foods. Macros are platform typical-cook per 100 g.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**ADR:** [`adr/0006-catalog-food-and-unified-calorie-diary.md`](adr/0006-catalog-food-and-unified-calorie-diary.md)

Auth: `Authorization: Bearer <accessToken>`. Errors: `{ "error": { "code", "message" } }`.

Frozen units (same keys on every food): `G` · `ML` · `PIECE` · `KATORI` · `CUP` · `GLASS` · `TBSP` · `TSP`. Meal slots: `BREAKFAST` · `MORNING_SNACK` · `LUNCH` · `EVENING_SNACK` · `DINNER`.

---

## Search catalog

`GET /foods/search?q=`

Any authenticated user. Seed catalog only (20 staples for now). Empty `q` returns the full bootstrap list.

**200:** `{ "foods": [ { id, name, aliases, caloriesPer100g, proteinGPer100g, carbsGPer100g, fatGPer100g, defaultUnit, units: [{ unit, label, grams, calories, proteinG, carbsG, fatG, isDefault }] } ] }`

---

## Client diary

Default day is **today in Asia/Kolkata** when `date` is omitted.

### Get day

`GET /me/calorie-logs?date=YYYY-MM-DD`

**200:** `{ "calorieLog": { logDate, totalCalories, totalProteinG, totalCarbsG, totalFatG, slots: [{ mealSlot, totals…, items }] } }`  
Empty day still returns zeros + empty slots.

### Log extra

`POST /me/calorie-logs/items`

```json
{ "foodItemId": "…", "servingId": "…", "quantity": 1, "mealSlot": "LUNCH", "logDate": "2026-08-17" }
```

`logDate` optional. Snapshots macros at write. Non-seed ids → **404**.

**201:** `{ "calorieLog": … }`

### Unlog extra

`DELETE /me/calorie-logs/items/:itemId`

Plan-linked (prescribed) rows cannot be deleted here — use uncomplete. **422** `INVALID_NUTRITION`.

**200:** `{ "calorieLog": … }`

---

## Staff diary (CALORIES grant)

`GET /gym-orgs/:gymOrgId/clients/:clientUserId/calorie-logs?date=`

Live Admin or Trainer at the gym **and** live `CALORIES` class grant.

**403** `NUTRITION_FORBIDDEN` without grant.

---

## Diet plans (coaching)

Requires in-date `TRAINER_COACHING` addon to assign or complete. Assigned Trainer, or Admin-as-Trainer (live trainer profile). **No** `DIET_PLANS` grant needed to author the definition.

### Assign

`POST /gym-orgs/:gymOrgId/clients/:clientUserId/diet-plans`

Archives the prior ACTIVE plan for that `(client, gym)`.

```json
{
  "title": "Cut week",
  "notes": null,
  "meals": [
    {
      "mealSlot": "BREAKFAST",
      "items": [{ "foodItemId": "…", "servingId": "…", "quantity": 2 }]
    }
  ]
}
```

**201:** `{ "dietPlan": … }` · **409** `COACHING_ADDON_REQUIRED`

### Staff get definition

`GET /gym-orgs/:gymOrgId/clients/:clientUserId/diet-plans`

**200:** `{ "dietPlan": … | null }` — definition only (no logged flags). Trainer must be the assigned trainer.

### Client my plan

`GET /gym-orgs/:gymOrgId/my-diet-plan`

`writable` is false after addon expiry (history still returned). Items include `logged` for gym-local today.

### Complete / uncomplete

`POST /gym-orgs/:gymOrgId/my-diet-plan/items/:itemId/complete`  
`DELETE /gym-orgs/:gymOrgId/my-diet-plan/items/:itemId/complete`

Writes / soft-deletes a plan-linked diary row. **204**. Second complete → **409** `ALREADY_LOGGED_PRESCRIBED`. Expired addon → **409** `COACHING_ADDON_REQUIRED`.
