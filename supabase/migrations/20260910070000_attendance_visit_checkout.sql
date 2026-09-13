-- Attendance as a visit (ADR-0013): check-out columns, closed-ping
-- backfill, and at most one open visit per client per gym.

alter table public.attendances
  add column checked_out_at timestamptz,
  add column checkout_recorder_user_id uuid references public.users (id);

update public.attendances
set
  checked_out_at = occurred_at,
  checkout_recorder_user_id = recorder_user_id
where
  checked_out_at is null
  and checkout_recorder_user_id is null;

alter table public.attendances
  add constraint attendances_checkout_pair_chk
    check (
      (checked_out_at is null and checkout_recorder_user_id is null)
      or (checked_out_at is not null and checkout_recorder_user_id is not null)
    ),
  add constraint attendances_checkout_after_checkin_chk
    check (
      checked_out_at is null
      or checked_out_at >= occurred_at
    );

create unique index attendances_one_open_visit_idx
  on public.attendances (gym_org_id, client_user_id)
  where deleted_at is null and checked_out_at is null;

comment on column public.attendances.occurred_at is
  'UTC check-in instant. Query local days via UTC bounds for gym TZ — do not wrap column in AT TIME ZONE in WHERE.';
comment on column public.attendances.checked_out_at is
  'UTC check-out instant. Null means the visit is still open. Duration is computed on read.';
comment on column public.attendances.checkout_recorder_user_id is
  'User who closed the visit (client self or Admin desk). Null iff checked_out_at is null.';
comment on table public.attendances is
  'GymOwned visit. Retained after leave; anonymize client_user_id on Erasure. One open visit per (gym, client). No per-day uniqueness. First check-in may set base subscription start when start_date is null.';
