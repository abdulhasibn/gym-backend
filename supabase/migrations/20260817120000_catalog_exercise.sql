-- Catalog exercise (ADR-0007).
-- Compat: workout_plan_exercises unused (empty). Safe to DROP name and
-- require exercise_item_id. CustomExercise columns exist; APIs deferred.

create type public.exercise_source as enum (
  'seed',
  'manual'
);

create type public.exercise_muscle as enum (
  'CHEST',
  'LATS',
  'UPPER_BACK',
  'LOWER_BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'CORE',
  'FULL_BODY',
  'CARDIO',
  'OTHER'
);

create type public.exercise_equipment as enum (
  'BARBELL',
  'DUMBBELL',
  'MACHINE',
  'CABLE',
  'BODYWEIGHT',
  'KETTLEBELL',
  'BAND',
  'OTHER'
);

create type public.exercise_measurement as enum (
  'WEIGHT_REPS',
  'REPS_ONLY',
  'DURATION',
  'BODYWEIGHT_ASSISTED'
);

create table public.exercise_items (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  aliases varchar[],
  primary_muscle public.exercise_muscle not null,
  equipment public.exercise_equipment not null,
  measurement public.exercise_measurement not null,
  source public.exercise_source not null default 'seed',
  created_by_user_id uuid references public.users (id),
  gym_org_id uuid references public.gym_orgs (id),
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_items_source_owner_chk check (
    (source = 'seed' and created_by_user_id is null and gym_org_id is null)
    or (source = 'manual' and created_by_user_id is not null)
  )
);

create index exercise_items_name_idx on public.exercise_items (name);
create index exercise_items_primary_muscle_idx
  on public.exercise_items (primary_muscle);
create index exercise_items_equipment_idx on public.exercise_items (equipment);
create index exercise_items_created_by_user_id_idx
  on public.exercise_items (created_by_user_id);
create index exercise_items_gym_org_id_idx on public.exercise_items (gym_org_id);

create unique index exercise_items_seed_name_live_uidx
  on public.exercise_items (lower(name))
  where source = 'seed' and deleted_at is null;

comment on table public.exercise_items is
  'Platform seed catalog or structured CustomExercise (ADR-0007). Never a free-text plan line.';
comment on column public.exercise_items.created_by_user_id is
  'Null for seed. Required for source=manual (CustomExercise).';
comment on column public.exercise_items.gym_org_id is
  'Set with created_by for gym-scoped CustomExercise; null for Client-owned custom and seed.';
comment on column public.exercise_items.name is
  'Display name. Seed rows include equipment when it changes identity (Hevy convention).';

alter table public.exercise_items enable row level security;

alter table public.workout_plan_exercises
  drop column name,
  add column exercise_item_id uuid not null references public.exercise_items (id);

create index workout_plan_exercises_exercise_item_id_idx
  on public.workout_plan_exercises (exercise_item_id);

comment on table public.workout_plan_exercises is
  'Prescription of a catalog ExerciseItem. Completions live in workout_plan_exercise_completions.';
comment on column public.workout_plan_exercises.exercise_item_id is
  'Required catalog identity (ADR-0007). sets/reps are the trainer prescription.';
