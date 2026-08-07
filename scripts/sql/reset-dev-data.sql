-- Dev-only clean slate: wipe all public rows + auth users, then re-seed frozen roles.
-- Invoked by: pnpm db:reset-data
-- Do NOT run against a production project with real customers.

DO $$
DECLARE
  stmt text;
BEGIN
  SELECT 'TRUNCATE TABLE '
      || string_agg(format('public.%I', tablename), ', ')
      || ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public';

  IF stmt IS NOT NULL THEN
    EXECUTE stmt;
  END IF;
END $$;

DELETE FROM auth.users;

-- Frozen system roles (mirrors 20260802021422_seed_roles_and_permissions.sql)
INSERT INTO public.roles (id, code, name, lane, sort_order)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'CLIENT', 'Client', 'CLIENT', 10),
  ('00000000-0000-4000-8000-000000000002', 'STAFF_UNASSIGNED', 'Staff (Unassigned)', 'STAFF', 20),
  ('00000000-0000-4000-8000-000000000003', 'TRAINER', 'Trainer', 'STAFF', 30),
  ('00000000-0000-4000-8000-000000000004', 'ADMIN', 'Admin', 'STAFF', 40)
ON CONFLICT (code) DO NOTHING;

WITH permissions (role_code, permission_code) AS (
  VALUES
    ('CLIENT', 'membership:read'),
    ('CLIENT', 'attendance:read'),
    ('CLIENT', 'attendance:write'),
    ('CLIENT', 'coaching:read'),
    ('CLIENT', 'profile:write'),
    ('CLIENT', 'grants:write'),
    ('STAFF_UNASSIGNED', 'org:create'),
    ('STAFF_UNASSIGNED', 'profile:write'),
    ('TRAINER', 'membership:read'),
    ('TRAINER', 'attendance:read'),
    ('TRAINER', 'coaching:assign'),
    ('TRAINER', 'coaching:read'),
    ('TRAINER', 'profile:write'),
    ('ADMIN', 'org:create'),
    ('ADMIN', 'org:write'),
    ('ADMIN', 'staff:invite'),
    ('ADMIN', 'membership:read'),
    ('ADMIN', 'membership:write'),
    ('ADMIN', 'invite:write'),
    ('ADMIN', 'billing:write'),
    ('ADMIN', 'plan_catalog:write'),
    ('ADMIN', 'attendance:read'),
    ('ADMIN', 'attendance:write'),
    ('ADMIN', 'checkin:block'),
    ('ADMIN', 'coaching:assign'),
    ('ADMIN', 'coaching:read'),
    ('ADMIN', 'lead:read'),
    ('ADMIN', 'lead:write'),
    ('ADMIN', 'profile:write')
)
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT roles.id, permissions.permission_code
FROM permissions
JOIN public.roles ON roles.code = permissions.role_code
ON CONFLICT (role_id, permission_code) DO NOTHING;
