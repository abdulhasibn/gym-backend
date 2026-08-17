# Catalog food and unified calorie diary

**Status:** accepted

Free-text food names (`custom_name`, `manual_description`, NL phrases that never resolve, “manual calorie line”) are unrepresentable. Every eaten or prescribed line is a `FoodItem` × `FoodServing` × quantity. Completing an assigned diet item **is** a diary write (plan-linked `CalorieLogItem`); extra food is the same diary without a plan link. Diet `PlanCompletion` rows are dropped — workout completions stay. Stint 3.1 ships catalog seed + diet assign + this diary together; 3.2 is workout only.

## Why

HealthifyMe-style logging (India gym MVP) is a catalog + portion picker + one eaten-today diary. A separate completion tick that does not change calories, and a calorie log that ignores the plan, cannot answer “did they eat Breakfast and also a samosa?”

## Rules

- **`FoodItem`** nutrients are per 100 g. **`FoodServing`** is a named portion with grams (`1 piece`, `1 medium katori`, `100 g`). Qty is a multiplier of that serving. Logged calories are **snapshotted** at write time (catalog edits do not rewrite history).
- **`food_source.seed`**: platform catalog (`created_by_user_id` and `gym_org_id` null). **`manual`**: structured **CustomFood** only — Client-owned (`created_by_user_id` set, `gym_org_id` null) or gym-scoped (`both` set). Not a typed meal name.
- Search: seed always; Client extras also own custom foods; staff assign also that gym’s custom foods. Clients do not browse other gyms’ custom foods (they may eat them if already on their assigned plan).
- **`MealSlot`**: `BREAKFAST` | `MORNING_SNACK` | `LUNCH` | `EVENING_SNACK` | `DINNER`. Plan meals and diary extras share this enum.
- At most one live plan-linked diary item per `(diet_plan_meal_item, calendar day)`. Un-complete = soft-delete that item.
- `DIET_PLANS` grant: plan definition adherence (prescribed vs eaten). `CALORIES` grant: diary including extras. Assigning trainer still authors the plan without `DIET_PLANS`.
- No barcode, no third-party nutrition API, no photo Snap (out of orbit).

## Ownership / modules

`nutrition` owns `FoodItem`, servings, CustomFood, and the diary (extras + prescribed writes). `coaching` owns diet/workout plan instances. Completing a diet item is a coaching use case that calls a nutrition **command port** (`LogPrescribedFood`), wired at the composition root — no cross-feature infrastructure imports. `FoodItemId`, `FoodServingId`, and `MealSlot` live in `src/domain/shared` (both features persist them).

## Considered Options

- **Keep `custom_name` / `manual_description` until the catalog is large** — rejected: garbage names become the default; extras never match plan foods.
- **Dual-write `diet_plan_item_completions` and the diary** — rejected: two sources of “did they eat it?”
- **NL parser as the primary Client path** — rejected: typing must search the catalog; phrase parse is a later convenience on top of the same resolver, not an alternate store.
- **User-editable nutrients without a serving** — rejected: Indian portions (katori / piece) are the product; per-100 g + grams is the scale math.

Downstream schema: `docs/schema.dbml`, migration `20260817094500_catalog_food_and_unified_diary.sql`.
