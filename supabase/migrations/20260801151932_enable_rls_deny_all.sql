-- Deny-all RLS baseline. Service-role backend bypasses RLS.
-- Feature-scoped policies will be added in later migrations.

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users enable row level security;
alter table public.client_profiles enable row level security;
alter table public.gym_orgs enable row level security;
alter table public.gym_admins enable row level security;
alter table public.trainer_profiles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.profile_attribute_grants enable row level security;
alter table public.data_grants enable row level security;
alter table public.membership_plans enable row level security;
alter table public.membership_invites enable row level security;
alter table public.client_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.attendances enable row level security;
alter table public.food_items enable row level security;
alter table public.calorie_log_entries enable row level security;
alter table public.calorie_log_items enable row level security;
alter table public.diet_plans enable row level security;
alter table public.diet_plan_meals enable row level security;
alter table public.diet_plan_meal_items enable row level security;
alter table public.diet_plan_item_completions enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_days enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_plan_exercise_completions enable row level security;
alter table public.progress_logs enable row level security;
alter table public.wearable_connections enable row level security;
alter table public.wearable_daily_metrics enable row level security;
alter table public.leads enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
