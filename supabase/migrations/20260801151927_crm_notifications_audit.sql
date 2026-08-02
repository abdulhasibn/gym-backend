-- M11 Mini-CRM, M12 Notifications, M13 Audit Trail

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid not null references public.gym_orgs (id),
  name varchar not null,
  phone varchar not null,
  source varchar,
  status public.lead_status not null default 'NEW',
  interest text,
  notes text,
  follow_up_date date,
  converted_membership_invite_id uuid references public.membership_invites (id),
  created_by uuid not null references public.users (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_gym_status_idx on public.leads (gym_org_id, status);
create index leads_gym_phone_idx on public.leads (gym_org_id, phone);
create index leads_follow_up_date_idx on public.leads (follow_up_date);
create index leads_created_by_idx on public.leads (created_by);
create index leads_converted_invite_id_idx
  on public.leads (converted_membership_invite_id);

comment on table public.leads is
  'GymOwned. Phone not unique — app soft-warns on duplicate open leads. Re-inquiry after LOST = new row.';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users (id),
  gym_org_id uuid references public.gym_orgs (id),
  type public.notification_type not null,
  title varchar not null,
  body text not null,
  data jsonb,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_at_idx
  on public.notifications (recipient_user_id, created_at);
create index notifications_gym_created_at_idx
  on public.notifications (gym_org_id, created_at);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid references public.gym_orgs (id),
  actor_user_id uuid not null references public.users (id),
  action varchar not null,
  target_type varchar not null,
  target_id uuid not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_gym_created_at_idx
  on public.audit_logs (gym_org_id, created_at);
create index audit_logs_target_idx
  on public.audit_logs (target_type, target_id);
create index audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

comment on table public.audit_logs is
  'Append-only. No deleted_at. On Erasure, scrub actor/subject to tombstone; retain rows.';
comment on column public.audit_logs.metadata is
  'Non-sensitive only — never medical notes, tokens, OTPs.';
