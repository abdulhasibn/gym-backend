-- M9 Nutrition (before coaching — diet_plan_meal_items references food_items)

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  aliases varchar[],
  default_portion varchar,
  calories numeric not null,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  source public.food_source not null default 'seed',
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_items_name_idx on public.food_items (name);

comment on table public.food_items is
  'Platform-owned Indian catalog (not per-gym).';

create table public.calorie_log_entries (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  log_date date not null,
  raw_input text,
  total_calories numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_carbs_g numeric not null default 0,
  total_fat_g numeric not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index calorie_log_entries_client_date_live_uidx
  on public.calorie_log_entries (client_user_id, log_date)
  where deleted_at is null;

comment on table public.calorie_log_entries is
  'ClientOwned. No gym_org_id. Staff read requires CALORIES grant. totals_* are denormalized aggregates of items.';

create table public.calorie_log_items (
  id uuid primary key default gen_random_uuid(),
  calorie_log_entry_id uuid not null references public.calorie_log_entries (id),
  food_item_id uuid references public.food_items (id),
  manual_description varchar,
  quantity numeric not null,
  unit varchar,
  calories numeric not null,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  deleted_at timestamptz
);

create index calorie_log_items_entry_id_idx
  on public.calorie_log_items (calorie_log_entry_id);
create index calorie_log_items_food_item_id_idx
  on public.calorie_log_items (food_item_id);
