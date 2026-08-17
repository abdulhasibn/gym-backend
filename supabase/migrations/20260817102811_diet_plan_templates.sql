-- Gym-owned diet plan templates (ADR-0008).
-- Assigned diet_plans stay Client-owned; cloned_from_template_id is
-- a snapshot pointer. Templates unused until this migration.

create table public.diet_plan_templates (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid not null references public.gym_orgs (id),
  trainer_id uuid not null references public.trainer_profiles (id),
  title varchar not null,
  notes text,
  cloned_from_id uuid references public.diet_plan_templates (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diet_plan_templates_gym_trainer_idx
  on public.diet_plan_templates (gym_org_id, trainer_id);
create index diet_plan_templates_cloned_from_id_idx
  on public.diet_plan_templates (cloned_from_id);

alter table public.diet_plan_templates enable row level security;

comment on table public.diet_plan_templates is
  'GymOwned diet library (ADR-0008). trainer_id is the authoring profile at that gym.';

create table public.diet_plan_template_meals (
  id uuid primary key default gen_random_uuid(),
  diet_plan_template_id uuid not null references public.diet_plan_templates (id),
  meal_slot public.meal_slot not null,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diet_plan_template_meals_template_id_idx
  on public.diet_plan_template_meals (diet_plan_template_id);
create unique index diet_plan_template_meals_slot_live_uidx
  on public.diet_plan_template_meals (diet_plan_template_id, meal_slot)
  where deleted_at is null;

alter table public.diet_plan_template_meals enable row level security;

create table public.diet_plan_template_meal_items (
  id uuid primary key default gen_random_uuid(),
  diet_plan_template_meal_id uuid not null
    references public.diet_plan_template_meals (id),
  food_item_id uuid not null references public.food_items (id),
  serving_id uuid not null references public.food_item_servings (id),
  quantity numeric not null,
  deleted_at timestamptz
);

create index diet_plan_template_meal_items_meal_id_idx
  on public.diet_plan_template_meal_items (diet_plan_template_meal_id);
create index diet_plan_template_meal_items_food_item_id_idx
  on public.diet_plan_template_meal_items (food_item_id);
create index diet_plan_template_meal_items_serving_id_idx
  on public.diet_plan_template_meal_items (serving_id);

alter table public.diet_plan_template_meal_items enable row level security;

comment on table public.diet_plan_template_meal_items is
  'Prescription on a gym template. Completing uses assigned diet_plan_meal_items ids.';

create trigger diet_plan_template_meal_items_serving_matches_food_trg
  before insert or update of food_item_id, serving_id
  on public.diet_plan_template_meal_items
  for each row
  execute function public.assert_serving_matches_food_item();

alter table public.diet_plans
  add column cloned_from_template_id uuid
    references public.diet_plan_templates (id);

create index diet_plans_cloned_from_template_id_idx
  on public.diet_plans (cloned_from_template_id);

comment on column public.diet_plans.cloned_from_template_id is
  'Snapshot source template. Later template edits do not rewrite this instance.';
