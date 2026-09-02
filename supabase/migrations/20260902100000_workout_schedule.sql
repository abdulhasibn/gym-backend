-- Client-owned workout schedule (ADR-0010).
-- Date days with REST or TRAINING (MORNING/EVENING sessions snapshotted from templates).

create type public.workout_schedule_day_kind as enum (
  'TRAINING',
  'REST'
);

create type public.workout_session_slot as enum (
  'MORNING',
  'EVENING'
);

create table public.workout_schedule_days (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  trainer_id uuid not null references public.trainer_profiles (id),
  schedule_date date not null,
  kind public.workout_schedule_day_kind not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workout_schedule_days_client_gym_date_live_uidx
  on public.workout_schedule_days (client_user_id, gym_org_id, schedule_date)
  where deleted_at is null;
create index workout_schedule_days_gym_org_id_idx
  on public.workout_schedule_days (gym_org_id);
create index workout_schedule_days_trainer_id_idx
  on public.workout_schedule_days (trainer_id);
create index workout_schedule_days_schedule_date_idx
  on public.workout_schedule_days (schedule_date);

alter table public.workout_schedule_days enable row level security;

comment on table public.workout_schedule_days is
  'ClientOwned schedule day (ADR-0010). gym_org_id is assigning-gym provenance.';

create table public.workout_schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  schedule_day_id uuid not null references public.workout_schedule_days (id),
  slot public.workout_session_slot not null,
  title varchar not null,
  cloned_from_template_id uuid not null references public.workout_plan_templates (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workout_schedule_sessions_day_slot_live_uidx
  on public.workout_schedule_sessions (schedule_day_id, slot)
  where deleted_at is null;
create index workout_schedule_sessions_template_id_idx
  on public.workout_schedule_sessions (cloned_from_template_id);

alter table public.workout_schedule_sessions enable row level security;

comment on table public.workout_schedule_sessions is
  'TRAINING day session snapshot (ADR-0010). title/exercises frozen at upsert.';

create table public.workout_schedule_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_schedule_sessions (id),
  exercise_item_id uuid not null references public.exercise_items (id),
  sets int,
  reps varchar,
  notes text,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_schedule_exercises_session_id_idx
  on public.workout_schedule_exercises (session_id);
create index workout_schedule_exercises_exercise_item_id_idx
  on public.workout_schedule_exercises (exercise_item_id);

alter table public.workout_schedule_exercises enable row level security;

create table public.workout_schedule_exercise_completions (
  id uuid primary key default gen_random_uuid(),
  workout_schedule_exercise_id uuid not null
    references public.workout_schedule_exercises (id),
  client_user_id uuid not null references public.users (id),
  completed_on date not null,
  created_at timestamptz not null default now()
);

create unique index workout_schedule_exercise_completions_uidx
  on public.workout_schedule_exercise_completions (
    workout_schedule_exercise_id,
    completed_on
  );
create index workout_schedule_exercise_completions_client_idx
  on public.workout_schedule_exercise_completions (client_user_id);

alter table public.workout_schedule_exercise_completions enable row level security;

comment on table public.workout_schedule_exercise_completions is
  'ClientOwned PlanCompletion for schedule exercises (ADR-0010).';
