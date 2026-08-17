-- Catalog food + unified calorie diary (ADR-0006).
-- Compat: diet_plans / calorie logs unused (empty). Safe to DROP completions,
-- NOT NULL catalog FKs, and MealSlot replace of free-text slot_name.

create type public.meal_slot as enum (
  'BREAKFAST',
  'MORNING_SNACK',
  'LUNCH',
  'EVENING_SNACK',
  'DINNER'
);

-- ── Food catalog ───────────────────────────────────────────────────────────

alter table public.food_items
  drop column if exists default_portion,
  add column created_by_user_id uuid references public.users (id),
  add column gym_org_id uuid references public.gym_orgs (id),
  add constraint food_items_source_owner_chk check (
    (source = 'seed' and created_by_user_id is null and gym_org_id is null)
    or (source = 'manual' and created_by_user_id is not null)
  ),
  add constraint food_items_calories_nonneg_chk check (calories >= 0);

comment on column public.food_items.calories is 'Per 100 g.';
comment on column public.food_items.protein_g is 'Per 100 g.';
comment on column public.food_items.carbs_g is 'Per 100 g.';
comment on column public.food_items.fat_g is 'Per 100 g.';
comment on column public.food_items.created_by_user_id is
  'Null for seed. Required for source=manual (CustomFood).';
comment on column public.food_items.gym_org_id is
  'Set with created_by for gym-scoped CustomFood; null for Client-owned custom and seed.';
comment on table public.food_items is
  'Platform seed catalog or structured CustomFood (ADR-0006). Never a free-text meal line.';

create index food_items_created_by_user_id_idx
  on public.food_items (created_by_user_id);
create index food_items_gym_org_id_idx
  on public.food_items (gym_org_id);

create table public.food_item_servings (
  id uuid primary key default gen_random_uuid(),
  food_item_id uuid not null references public.food_items (id),
  label varchar not null,
  grams numeric not null,
  is_default boolean not null default false,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_item_servings_grams_positive_chk check (grams > 0)
);

create index food_item_servings_food_item_id_idx
  on public.food_item_servings (food_item_id);
create unique index food_item_servings_label_live_uidx
  on public.food_item_servings (food_item_id, label)
  where deleted_at is null;
create unique index food_item_servings_one_default_live_uidx
  on public.food_item_servings (food_item_id)
  where is_default and deleted_at is null;

comment on table public.food_item_servings is
  'Named portion (1 piece, 1 medium katori, 100 g). Qty multiplies grams.';

alter table public.food_item_servings enable row level security;

-- ── Diet plan: catalog-only items; drop diet PlanCompletion ───────────────

drop table if exists public.diet_plan_item_completions;

alter table public.diet_plan_meals
  drop column slot_name,
  add column meal_slot public.meal_slot not null;

create unique index diet_plan_meals_slot_live_uidx
  on public.diet_plan_meals (diet_plan_id, meal_slot)
  where deleted_at is null;

comment on table public.diet_plan_meals is
  'MealSlot shared with calorie_log_items so extras sit on the same slots. ADR-0006.';

alter table public.diet_plan_meal_items
  drop column custom_name,
  drop column unit,
  alter column food_item_id set not null,
  add column serving_id uuid not null references public.food_item_servings (id);

create index diet_plan_meal_items_serving_id_idx
  on public.diet_plan_meal_items (serving_id);

comment on table public.diet_plan_meal_items is
  'Prescription of a catalog FoodItem × FoodServing × qty. Completing writes a plan-linked CalorieLogItem (ADR-0006).';
comment on table public.diet_plans is
  'ClientOwned instance. Completing a meal item writes a plan-linked CalorieLogItem (ADR-0006). At most one ACTIVE per (client, assigning gym).';

-- ── Diary ─────────────────────────────────────────────────────────────────

alter table public.calorie_log_entries
  drop column if exists raw_input;

comment on table public.calorie_log_entries is
  'ClientOwned eaten-today header. totals_* denormalize live items. ADR-0006.';
comment on column public.calorie_log_entries.log_date is
  'Assigning-gym timezone when plan-linked; else Asia/Kolkata.';

alter table public.calorie_log_items
  drop column if exists manual_description,
  drop column if exists unit,
  alter column food_item_id set not null,
  add column serving_id uuid not null references public.food_item_servings (id),
  add column meal_slot public.meal_slot not null,
  add column diet_plan_meal_item_id uuid references public.diet_plan_meal_items (id);

create index calorie_log_items_serving_id_idx
  on public.calorie_log_items (serving_id);
create index calorie_log_items_diet_plan_meal_item_id_idx
  on public.calorie_log_items (diet_plan_meal_item_id);
create unique index calorie_log_items_plan_item_day_live_uidx
  on public.calorie_log_items (diet_plan_meal_item_id, calorie_log_entry_id)
  where diet_plan_meal_item_id is not null and deleted_at is null;

comment on table public.calorie_log_items is
  'What was eaten. Plan-linked unique per assigned item × day. No free-text description.';
comment on column public.calorie_log_items.calories is 'Snapshot at write.';
comment on column public.calorie_log_items.diet_plan_meal_item_id is
  'Set when completing an assigned item; null = extra.';

-- Serving must belong to the same food as the line.

create or replace function public.assert_serving_matches_food_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  serving_food uuid;
begin
  select s.food_item_id into serving_food
  from public.food_item_servings as s
  where s.id = new.serving_id
    and s.deleted_at is null;

  if serving_food is null or serving_food is distinct from new.food_item_id then
    raise exception 'serving_id does not belong to food_item_id';
  end if;

  return new;
end;
$$;

create trigger diet_plan_meal_items_serving_matches_food_trg
  before insert or update of food_item_id, serving_id
  on public.diet_plan_meal_items
  for each row
  execute function public.assert_serving_matches_food_item();

create trigger calorie_log_items_serving_matches_food_trg
  before insert or update of food_item_id, serving_id
  on public.calorie_log_items
  for each row
  execute function public.assert_serving_matches_food_item();
