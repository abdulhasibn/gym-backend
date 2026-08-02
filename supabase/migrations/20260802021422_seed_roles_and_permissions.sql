-- Frozen system roles and permission lookup data.
-- Do not expose write paths for these tables at runtime.

insert into public.roles (id, code, name, lane, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'CLIENT', 'Client', 'CLIENT', 10),
  ('00000000-0000-4000-8000-000000000002', 'STAFF_UNASSIGNED', 'Staff (Unassigned)', 'STAFF', 20),
  ('00000000-0000-4000-8000-000000000003', 'TRAINER', 'Trainer', 'STAFF', 30),
  ('00000000-0000-4000-8000-000000000004', 'ADMIN', 'Admin', 'STAFF', 40)
on conflict (code) do nothing;

with permissions (role_code, permission_code) as (
  values
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
insert into public.role_permissions (role_id, permission_code)
select roles.id, permissions.permission_code
from permissions
join public.roles on roles.code = permissions.role_code
on conflict (role_id, permission_code) do nothing;
