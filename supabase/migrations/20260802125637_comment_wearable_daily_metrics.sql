comment on table public.wearable_daily_metrics is
  'ClientOwned daily metrics store. Staff read requires WEARABLES grant. Erase with ClientOwned purge. No soft-delete because each metric is an immutable daily import; user corrections replace the unique (client_user_id, provider, metric_on) row.';
