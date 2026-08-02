-- M3/M4 Plans catalog, memberships, subscriptions

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid not null references public.gym_orgs (id),
  name varchar not null,
  kind public.plan_kind not null,
  capability public.plan_capability,
  duration_days int not null,
  price numeric(12, 2) not null,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_plans_capability_for_addon_chk
    check ((kind = 'ADDON') = (capability is not null))
);

create index membership_plans_gym_org_id_idx on public.membership_plans (gym_org_id);
create index membership_plans_gym_kind_idx on public.membership_plans (gym_org_id, kind);

comment on table public.membership_plans is
  'Catalog price is not the denominator for existing subscription lines — those snapshot at creation.';

-- Create invites without accepted_membership_id FK first (circular with client_memberships)
create table public.membership_invites (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid not null references public.gym_orgs (id),
  invited_email varchar not null,
  invited_user_id uuid references public.users (id),
  invitee_name varchar not null,
  invitee_phone varchar,
  base_plan_id uuid not null references public.membership_plans (id),
  base_payment_status public.payment_status not null default 'unpaid',
  addon_plan_id uuid references public.membership_plans (id),
  addon_payment_status public.payment_status,
  status public.invite_status not null default 'PENDING',
  expires_at timestamptz,
  created_by uuid not null references public.users (id),
  accepted_at timestamptz,
  accepted_membership_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_invites_addon_payment_chk
    check ((addon_plan_id is null) = (addon_payment_status is null))
);

create index membership_invites_gym_email_status_idx
  on public.membership_invites (gym_org_id, invited_email, status);
create index membership_invites_invited_user_id_idx on public.membership_invites (invited_user_id);
create index membership_invites_invited_email_idx on public.membership_invites (invited_email);
create index membership_invites_expires_at_idx on public.membership_invites (expires_at);
create index membership_invites_created_by_idx on public.membership_invites (created_by);
create index membership_invites_base_plan_id_idx on public.membership_invites (base_plan_id);
create index membership_invites_addon_plan_id_idx on public.membership_invites (addon_plan_id);
create index membership_invites_accepted_membership_id_idx
  on public.membership_invites (accepted_membership_id);

create unique index membership_invites_one_pending_uidx
  on public.membership_invites (gym_org_id, lower(invited_email))
  where status = 'PENDING' and deleted_at is null;

comment on table public.membership_invites is
  'Only client join path. No price snapshot on invite — catalog price copied onto Subscription at accept.';

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  status public.membership_status not null default 'ACTIVE',
  check_in_blocked boolean not null default false,
  assigned_trainer_id uuid references public.trainer_profiles (id),
  source_invite_id uuid references public.membership_invites (id),
  joined_at timestamptz not null,
  left_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_memberships_client_user_id_idx on public.client_memberships (client_user_id);
create index client_memberships_gym_status_idx on public.client_memberships (gym_org_id, status);
create index client_memberships_assigned_trainer_id_idx
  on public.client_memberships (assigned_trainer_id);
create index client_memberships_source_invite_id_idx
  on public.client_memberships (source_invite_id);

create unique index client_memberships_one_active_uidx
  on public.client_memberships (client_user_id)
  where status = 'ACTIVE' and deleted_at is null;

comment on table public.client_memberships is
  'GymOwned. Created only on invite accept. Offboard → INACTIVE + clear all DataGrants for (client, gym).';

-- Close the circular FK
alter table public.membership_invites
  add constraint membership_invites_accepted_membership_id_fkey
  foreign key (accepted_membership_id) references public.client_memberships (id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_membership_id uuid not null references public.client_memberships (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  plan_id uuid not null references public.membership_plans (id),
  kind public.plan_kind not null,
  capability public.plan_capability,
  -- Immutable text key for EXCLUDE: '' for BASE, capability label for ADDON.
  -- Enum::text casts are not IMMUTABLE in Postgres, so coalesce(capability::text,'')
  -- cannot be used directly in an exclusion constraint (ADR-0004). Set by trigger.
  overlap_key text not null default '',
  price_amount numeric(12, 2) not null,
  duration_days int not null,
  start_date date,
  end_date date,
  start_source public.subscription_start_source,
  payment_status public.payment_status not null default 'unpaid',
  amount_paid numeric(12, 2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_end_after_start_chk
    check (end_date is null or start_date is null or end_date >= start_date),
  constraint subscriptions_amount_paid_range_chk
    check (amount_paid >= 0 and amount_paid <= price_amount),
  constraint subscriptions_payment_status_chk
    check (
      (payment_status = 'unpaid' and amount_paid = 0)
      or (payment_status = 'paid' and amount_paid = price_amount)
      or (payment_status = 'partial' and amount_paid > 0 and amount_paid < price_amount)
    ),
  constraint subscriptions_capability_for_addon_chk
    check ((kind = 'ADDON') = (capability is not null))
);

create or replace function public.subscriptions_set_overlap_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'BASE' then
    new.overlap_key := '';
  else
    new.overlap_key := new.capability::text;
  end if;
  return new;
end;
$$;

create trigger subscriptions_set_overlap_key_trg
  before insert or update of kind, capability
  on public.subscriptions
  for each row
  execute function public.subscriptions_set_overlap_key();

create index subscriptions_client_membership_id_idx
  on public.subscriptions (client_membership_id);
create index subscriptions_gym_org_id_idx on public.subscriptions (gym_org_id);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index subscriptions_end_date_idx on public.subscriptions (end_date);
create index subscriptions_membership_end_date_idx
  on public.subscriptions (client_membership_id, end_date);

-- Non-overlap of dated live lines within BASE / same ADDON capability (ADR-0004).
-- Two partial constraints avoid putting enum columns into GiST (no default opclass).
alter table public.subscriptions
  add constraint subscriptions_no_overlap_base
  exclude using gist (
    client_membership_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (deleted_at is null and start_date is not null and kind = 'BASE');

alter table public.subscriptions
  add constraint subscriptions_no_overlap_addon
  exclude using gist (
    client_membership_id with =,
    overlap_key with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (deleted_at is null and start_date is not null and kind = 'ADDON');

create unique index subscriptions_one_unstarted_base_uidx
  on public.subscriptions (client_membership_id)
  where kind = 'BASE' and start_date is null and deleted_at is null;

comment on table public.subscriptions is
  'GymOwned. Renew = new row. Snapshot price/duration (ADR-0004). Non-overlap via EXCLUDE USING gist.';
