-- ADR-0014: one TRAINING list per date. Flatten morning+evening into a single
-- live session; title + cloned_from_template_id become nullable provenance.

-- Move evening exercises onto the morning session (morning first, then evening).
update public.workout_schedule_exercises as evening_ex
set
  session_id = morning.id,
  sort_order = evening_ex.sort_order + coalesce(morning_max.max_order, -1) + 1,
  updated_at = now()
from public.workout_schedule_sessions as evening
join public.workout_schedule_sessions as morning
  on morning.schedule_day_id = evening.schedule_day_id
 and morning.deleted_at is null
 and morning.slot = 'MORNING'
join lateral (
  select max(e.sort_order) as max_order
  from public.workout_schedule_exercises e
  where e.session_id = morning.id
    and e.deleted_at is null
) as morning_max on true
where evening_ex.session_id = evening.id
  and evening.deleted_at is null
  and evening.slot = 'EVENING';

-- Combined title when both slots existed.
update public.workout_schedule_sessions as morning
set
  title = 'Morning / Evening',
  updated_at = now()
from public.workout_schedule_sessions as evening
where morning.schedule_day_id = evening.schedule_day_id
  and morning.deleted_at is null
  and morning.slot = 'MORNING'
  and evening.deleted_at is null
  and evening.slot = 'EVENING';

-- Soft-delete the extra evening session.
update public.workout_schedule_sessions as evening
set
  deleted_at = now(),
  updated_at = now()
from public.workout_schedule_sessions as morning
where evening.schedule_day_id = morning.schedule_day_id
  and evening.deleted_at is null
  and evening.slot = 'EVENING'
  and morning.deleted_at is null
  and morning.slot = 'MORNING';

alter table public.workout_schedule_sessions
  alter column title drop not null;

alter table public.workout_schedule_sessions
  alter column cloned_from_template_id drop not null;

drop index if exists public.workout_schedule_sessions_day_slot_live_uidx;

create unique index workout_schedule_sessions_day_live_uidx
  on public.workout_schedule_sessions (schedule_day_id)
  where deleted_at is null;

comment on table public.workout_schedule_sessions is
  '1:1 TRAINING container (ADR-0014). title/exercises snapshotted on upsert; slot unused by API.';

comment on column public.workout_schedule_sessions.cloned_from_template_id is
  'Optional import provenance. Null when built from scratch or source template is gone.';
