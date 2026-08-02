-- M2 Gym Organization + DataGrants / ProfileAttributeGrants

create table public.gym_orgs (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  address text,
  contact_phone varchar,
  contact_email varchar,
  logo_url text,
  timezone varchar not null default 'Asia/Kolkata',
  owner_user_id uuid not null references public.users (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gym_orgs_owner_user_id_idx on public.gym_orgs (owner_user_id);

comment on table public.gym_orgs is
  'Tenancy root for GymOwnedRecord. No open join codes in MVP — membership is invite-only.';

create table public.gym_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  is_owner boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index gym_admins_gym_org_id_idx on public.gym_admins (gym_org_id);

create unique index gym_admins_user_gym_live_uidx
  on public.gym_admins (user_id, gym_org_id)
  where deleted_at is null;

comment on table public.gym_admins is
  'App-layer Admin cap (e.g. max 3). Owner retained via gym_orgs.owner_user_id + is_owner.';

create table public.trainer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  bio text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index trainer_profiles_gym_org_id_idx on public.trainer_profiles (gym_org_id);

create unique index trainer_profiles_user_gym_live_uidx
  on public.trainer_profiles (user_id, gym_org_id)
  where deleted_at is null;

comment on table public.trainer_profiles is
  'Admin-as-Trainer: ADMIN user also gets a trainer_profiles row in their org.';

create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  gym_org_id uuid not null references public.gym_orgs (id),
  invited_user_id uuid not null references public.users (id),
  target_role public.staff_invite_target_role not null,
  status public.invite_status not null default 'PENDING',
  expires_at timestamptz,
  created_by uuid not null references public.users (id),
  accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_invites_gym_user_status_idx
  on public.staff_invites (gym_org_id, invited_user_id, status);
create index staff_invites_invited_user_id_idx on public.staff_invites (invited_user_id);
create index staff_invites_expires_at_idx on public.staff_invites (expires_at);
create index staff_invites_created_by_idx on public.staff_invites (created_by);

create unique index staff_invites_one_pending_uidx
  on public.staff_invites (gym_org_id, invited_user_id)
  where status = 'PENDING' and deleted_at is null;

comment on table public.staff_invites is
  'In-app invitation list for STAFF users. Accept → trainer_profiles and/or gym_admins + set users.role_id. At most one PENDING per (gym, user).';

create table public.profile_attribute_grants (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  attribute public.profile_attribute not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index profile_attribute_grants_gym_org_id_idx
  on public.profile_attribute_grants (gym_org_id);

create unique index profile_attribute_grants_live_uidx
  on public.profile_attribute_grants (client_user_id, gym_org_id, attribute)
  where deleted_at is null;

comment on table public.profile_attribute_grants is
  'DataGrant shape for profile fields. No data copy. Accept REQUIRES DOB, HEIGHT, WEIGHT. Leave/revoke soft-deletes all grants for (client, gym).';

create table public.data_grants (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  gym_org_id uuid not null references public.gym_orgs (id),
  class public.data_grant_class not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index data_grants_gym_org_id_idx on public.data_grants (gym_org_id);

create unique index data_grants_live_uidx
  on public.data_grants (client_user_id, gym_org_id, class)
  where deleted_at is null;

comment on table public.data_grants is
  'Class-level DataGrants. Optional on accept (default off). Leave/revoke clears all for (client, gym). New gym = fresh checklist.';
