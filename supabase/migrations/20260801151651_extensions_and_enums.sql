-- Extensions required by the schema
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Enums (from docs/schema.dbml)

create type public.account_lane as enum (
  'CLIENT',
  'STAFF'
);

create type public.membership_status as enum (
  'ACTIVE',
  'INACTIVE'
);

create type public.invite_status as enum (
  'PENDING',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED'
);

create type public.staff_invite_target_role as enum (
  'TRAINER',
  'ADMIN'
);

create type public.payment_status as enum (
  'paid',
  'unpaid',
  'partial'
);

create type public.subscription_start_source as enum (
  'FIRST_ATTENDANCE',
  'ADMIN_OVERRIDE',
  'ADMIN_ATTACH'
);

create type public.plan_kind as enum (
  'BASE',
  'ADDON'
);

create type public.plan_capability as enum (
  'TRAINER_COACHING'
);

create type public.coaching_plan_status as enum (
  'ACTIVE',
  'ARCHIVED'
);

create type public.profile_attribute as enum (
  'DOB',
  'HEIGHT',
  'WEIGHT',
  'GENDER',
  'MEDICAL_NOTES'
);

create type public.data_grant_class as enum (
  'PROGRESS',
  'CALORIES',
  'WEARABLES',
  'DIET_PLANS',
  'WORKOUT_PLANS'
);

create type public.attendance_recorder as enum (
  'CLIENT',
  'ADMIN'
);

create type public.lead_status as enum (
  'NEW',
  'CONTACTED',
  'TRIAL',
  'CONVERTED',
  'LOST'
);

create type public.food_source as enum (
  'seed',
  'manual'
);

create type public.wearable_provider as enum (
  'APPLE_HEALTH',
  'HEALTH_CONNECT',
  'SAMSUNG_HEALTH'
);

create type public.gender as enum (
  'MALE',
  'FEMALE',
  'OTHER'
);

create type public.notification_type as enum (
  'SUBSCRIPTION_EXPIRING',
  'PAYMENT_PENDING_DIGEST',
  'TRAINER_ASSIGNED',
  'TRAINER_REASSIGNED',
  'PLAN_ASSIGNED',
  'INVITE_PENDING_CLAIM',
  'STAFF_INVITE_PENDING',
  'LEAD_FOLLOWUP_DUE',
  'CHECKIN_BLOCKED',
  'CHECKIN_UNBLOCKED'
);
