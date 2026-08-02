-- M8 Progress & M10 Health Sync (Client-owned)

create table public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  log_date date not null,
  weight_kg numeric(5, 2),
  bmi numeric(5, 2),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index progress_logs_client_date_live_uidx
  on public.progress_logs (client_user_id, log_date)
  where deleted_at is null;

comment on table public.progress_logs is
  'ClientOwned. No gym_org_id. Staff read requires PROGRESS grant. Updates client_profiles.weight_kg as current.';

create table public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  provider public.wearable_provider not null,
  auth_ref jsonb,
  last_synced_at timestamptz,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index wearable_connections_client_provider_live_uidx
  on public.wearable_connections (client_user_id, provider)
  where deleted_at is null;

comment on table public.wearable_connections is
  'ClientOwned. No gym_org_id. Staff read of metrics requires WEARABLES grant.';
comment on column public.wearable_connections.auth_ref is
  'Prefer empty for HealthKit/Health Connect (device push). If a provider needs a server token, store via Vault/pgcrypto — never plaintext long-term.';

create table public.wearable_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users (id),
  provider public.wearable_provider not null,
  metric_on date not null,
  steps int,
  active_kcal numeric,
  weight_kg numeric(5, 2),
  workout_minutes int,
  ingested_at timestamptz not null default now(),
  unique (client_user_id, provider, metric_on)
);

create index wearable_daily_metrics_client_user_id_idx
  on public.wearable_daily_metrics (client_user_id);

comment on table public.wearable_daily_metrics is
  'ClientOwned daily metrics store. Staff read requires WEARABLES grant. Erase with ClientOwned purge.';
