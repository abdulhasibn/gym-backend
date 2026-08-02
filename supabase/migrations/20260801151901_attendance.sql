-- M5 Attendance

create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  occurred_at timestamptz not null default now(),
  recorded_by public.attendance_recorder not null,
  recorder_user_id uuid not null references public.users (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint attendances_client_recorder_chk
    check (
      recorded_by <> 'CLIENT'
      or recorder_user_id = client_user_id
    )
);

create index attendances_gym_occurred_at_idx
  on public.attendances (gym_org_id, occurred_at);
create index attendances_client_occurred_at_idx
  on public.attendances (client_user_id, occurred_at);
create index attendances_recorder_user_id_idx
  on public.attendances (recorder_user_id);

comment on table public.attendances is
  'GymOwned. Retained after leave; anonymize client_user_id on Erasure. No per-day uniqueness in MVP.';
comment on column public.attendances.occurred_at is
  'UTC instant. Query local days via UTC bounds for gym TZ — do not wrap column in AT TIME ZONE in WHERE.';
