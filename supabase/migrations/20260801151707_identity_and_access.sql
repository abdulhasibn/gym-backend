-- M1 Identity & Access — frozen roles + users + client profiles

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code varchar not null unique,
  name varchar not null,
  lane public.account_lane not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.roles is
  'Frozen after migrate/seed. App DB role: SELECT only (no INSERT/UPDATE/DELETE). No gym-editable RBAC.';

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id),
  permission_code varchar not null,
  created_at timestamptz not null default now(),
  unique (role_id, permission_code)
);

create index role_permissions_role_id_idx on public.role_permissions (role_id);

comment on table public.role_permissions is
  'Frozen seed. Runtime authz still requires gym affiliation where the action is tenant-scoped.';

create table public.users (
  id uuid primary key references auth.users (id),
  role_id uuid not null references public.roles (id),
  name varchar not null,
  email varchar not null unique,
  email_verified_at timestamptz,
  phone varchar,
  google_id varchar unique,
  staff_code varchar unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_id_idx on public.users (role_id);

comment on table public.users is
  'Signup sets role_id: CLIENT or STAFF_UNASSIGNED. Staff invite accept → TRAINER or ADMIN. At most one ACTIVE client_membership per user. Erasure deletes this row after ClientOwned purge (ADR-0003). id MUST equal auth.users.id.';

create table public.client_profiles (
  user_id uuid primary key references public.users (id),
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  dob date,
  gender public.gender,
  medical_notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.client_profiles.medical_notes is
  'Sensitive. Never log. Visible to gym staff only when MEDICAL_NOTES grant exists for that gym.';
