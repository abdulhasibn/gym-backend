-- Gym-owned workout plan templates (ADR-0009).
-- Flat exercise lists only. Schedule / assign-from-template deferred.

create table public.workout_plan_templates (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid not null references public.gym_orgs (id),
  trainer_id uuid not null references public.trainer_profiles (id),
  title varchar not null,
  notes text,
  cloned_from_id uuid references public.workout_plan_templates (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plan_templates_gym_trainer_idx
  on public.workout_plan_templates (gym_org_id, trainer_id);
create index workout_plan_templates_cloned_from_id_idx
  on public.workout_plan_templates (cloned_from_id);

alter table public.workout_plan_templates enable row level security;

comment on table public.workout_plan_templates is
  'GymOwned workout library (ADR-0009). trainer_id is the authoring profile at that gym. Gym-global read; author/Admin mutate.';

create table public.workout_plan_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_template_id uuid not null
    references public.workout_plan_templates (id),
  exercise_item_id uuid not null references public.exercise_items (id),
  sets int,
  reps varchar,
  notes text,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plan_template_exercises_template_id_idx
  on public.workout_plan_template_exercises (workout_plan_template_id);
create index workout_plan_template_exercises_exercise_item_id_idx
  on public.workout_plan_template_exercises (exercise_item_id);

alter table public.workout_plan_template_exercises enable row level security;

comment on table public.workout_plan_template_exercises is
  'Prescription on a gym workout template (ADR-0009). Completing uses later schedule session exercise ids.';
