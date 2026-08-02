-- M6/M7 Coaching — Diet & Workout (Client-owned instances)

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  trainer_id uuid not null references public.trainer_profiles (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  title varchar not null,
  notes text,
  status public.coaching_plan_status not null default 'ACTIVE',
  cloned_from_id uuid references public.diet_plans (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diet_plans_client_gym_status_idx
  on public.diet_plans (client_user_id, gym_org_id, status);
create index diet_plans_gym_org_id_idx on public.diet_plans (gym_org_id);
create index diet_plans_trainer_id_idx on public.diet_plans (trainer_id);
create index diet_plans_cloned_from_id_idx on public.diet_plans (cloned_from_id);

create unique index diet_plans_one_active_uidx
  on public.diet_plans (client_user_id, gym_org_id)
  where status = 'ACTIVE' and deleted_at is null;

comment on table public.diet_plans is
  'ClientOwned instance. Assign with in-date TRAINER_COACHING. At most one ACTIVE per (client, assigning gym).';

create table public.diet_plan_meals (
  id uuid primary key default gen_random_uuid(),
  diet_plan_id uuid not null references public.diet_plans (id),
  slot_name varchar not null,
  target_calories numeric,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_fat_g numeric,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diet_plan_meals_diet_plan_id_idx on public.diet_plan_meals (diet_plan_id);

create table public.diet_plan_meal_items (
  id uuid primary key default gen_random_uuid(),
  diet_plan_meal_id uuid not null references public.diet_plan_meals (id),
  food_item_id uuid references public.food_items (id),
  custom_name varchar,
  quantity numeric not null,
  unit varchar not null,
  deleted_at timestamptz
);

create index diet_plan_meal_items_meal_id_idx
  on public.diet_plan_meal_items (diet_plan_meal_id);
create index diet_plan_meal_items_food_item_id_idx
  on public.diet_plan_meal_items (food_item_id);

comment on table public.diet_plan_meal_items is
  'Template item only — completions live in diet_plan_item_completions.';

create table public.diet_plan_item_completions (
  id uuid primary key default gen_random_uuid(),
  diet_plan_meal_item_id uuid not null references public.diet_plan_meal_items (id),
  client_user_id uuid not null references public.users (id),
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (diet_plan_meal_item_id, completed_on)
);

create index diet_plan_item_completions_client_user_id_idx
  on public.diet_plan_item_completions (client_user_id);

comment on table public.diet_plan_item_completions is
  'ClientOwned PlanCompletion. Staff read requires DIET_PLANS grant. No soft-delete.';

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  trainer_id uuid not null references public.trainer_profiles (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  title varchar not null,
  notes text,
  status public.coaching_plan_status not null default 'ACTIVE',
  cloned_from_id uuid references public.workout_plans (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plans_client_gym_status_idx
  on public.workout_plans (client_user_id, gym_org_id, status);
create index workout_plans_gym_org_id_idx on public.workout_plans (gym_org_id);
create index workout_plans_trainer_id_idx on public.workout_plans (trainer_id);
create index workout_plans_cloned_from_id_idx on public.workout_plans (cloned_from_id);

create unique index workout_plans_one_active_uidx
  on public.workout_plans (client_user_id, gym_org_id)
  where status = 'ACTIVE' and deleted_at is null;

comment on table public.workout_plans is
  'Same ownership and grant rules as diet_plans (WORKOUT_PLANS for adherence).';

create table public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans (id),
  day_label varchar not null,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plan_days_workout_plan_id_idx
  on public.workout_plan_days (workout_plan_id);

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_day_id uuid not null references public.workout_plan_days (id),
  name varchar not null,
  sets int,
  reps varchar,
  notes text,
  sort_order int not null default 0,
  deleted_at timestamptz
);

create index workout_plan_exercises_day_id_idx
  on public.workout_plan_exercises (workout_plan_day_id);

comment on table public.workout_plan_exercises is
  'Template exercise only — completions live in workout_plan_exercise_completions.';

create table public.workout_plan_exercise_completions (
  id uuid primary key default gen_random_uuid(),
  workout_plan_exercise_id uuid not null references public.workout_plan_exercises (id),
  client_user_id uuid not null references public.users (id),
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (workout_plan_exercise_id, completed_on)
);

create index workout_plan_exercise_completions_client_user_id_idx
  on public.workout_plan_exercise_completions (client_user_id);

comment on table public.workout_plan_exercise_completions is
  'ClientOwned PlanCompletion. Staff read requires WORKOUT_PLANS grant.';
