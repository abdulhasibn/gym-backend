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

-- Bootstrap catalog (mirrors 20260817101500_seed_food_catalog_v1.sql). Truncate wipes rows.
insert into public.food_items (
  id, name, aliases, calories, protein_g, carbs_g, fat_g, source, active
)
values
  ('f00d0000-0000-4000-8000-000000000001', 'Idli', array['idly']::varchar[], 135, 4.0, 27.0, 0.5, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000002', 'Plain dosa', array['dosa']::varchar[], 184, 4.5, 28.0, 5.5, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000003', 'Poha', array['powa', 'flattened rice']::varchar[], 170, 3.4, 32.0, 3.2, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000004', 'Upma', array['uppuma']::varchar[], 155, 4.0, 24.0, 4.8, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000005', 'Roti', array['chapati', 'phulka']::varchar[], 297, 11.0, 56.0, 3.7, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000006', 'Steamed rice', array['plain rice', 'cooked rice']::varchar[], 130, 2.7, 28.2, 0.3, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000007', 'Dal tadka', array['dal', 'toor dal']::varchar[], 116, 7.2, 15.4, 3.8, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000008', 'Sambar', array['sambhar']::varchar[], 75, 3.2, 11.0, 2.0, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000009', 'Mixed veg sabzi', array['sabzi', 'mixed vegetables']::varchar[], 92, 2.4, 10.5, 4.6, 'seed', true),
  ('f00d0000-0000-4000-8000-00000000000a', 'Chicken curry', array['murgh curry']::varchar[], 178, 14.5, 5.2, 11.0, 'seed', true),
  ('f00d0000-0000-4000-8000-00000000000b', 'Grilled chicken', array['chicken breast']::varchar[], 165, 31.0, 0.0, 3.6, 'seed', true),
  ('f00d0000-0000-4000-8000-00000000000c', 'Boiled egg', array['egg']::varchar[], 155, 12.6, 1.1, 10.6, 'seed', true),
  ('f00d0000-0000-4000-8000-00000000000d', 'Omelette', array['omelet']::varchar[], 168, 11.5, 1.4, 12.8, 'seed', true),
  ('f00d0000-0000-4000-8000-00000000000e', 'Paneer bhurji', array['paneer scramble']::varchar[], 224, 14.0, 5.5, 16.2, 'seed', true),
  ('f00d0000-0000-4000-8000-00000000000f', 'Curd', array['dahi', 'yogurt']::varchar[], 61, 3.5, 4.7, 3.3, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000010', 'Toned milk', array['milk', 'doodh']::varchar[], 58, 3.1, 4.7, 3.0, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000011', 'Banana', array['kela']::varchar[], 89, 1.1, 23.0, 0.3, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000012', 'Apple', array['seb']::varchar[], 52, 0.3, 14.0, 0.2, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000013', 'Samosa', array['singhara']::varchar[], 262, 5.2, 30.0, 13.8, 'seed', true),
  ('f00d0000-0000-4000-8000-000000000014', 'Brown bread', array['bread slice']::varchar[], 247, 8.8, 43.0, 4.2, 'seed', true)
on conflict (id) do nothing;

insert into public.food_item_servings (
  id, food_item_id, unit, label, grams, is_default, sort_order
)
select
  (
    'f00d5e04-0000-4000-8000-'
    || lpad(to_hex(catalog.n), 8, '0')
    || lpad(to_hex(units.n), 4, '0')
  )::uuid,
  catalog.id,
  units.unit,
  units.label,
  case when units.unit = 'PIECE' then catalog.piece_g else units.grams end,
  units.unit = catalog.default_unit,
  units.sort_order
from (
  values
    (1,  'f00d0000-0000-4000-8000-000000000001'::uuid, 'PIECE'::public.food_serving_unit, 30::numeric),
    (2,  'f00d0000-0000-4000-8000-000000000002'::uuid, 'PIECE', 80),
    (3,  'f00d0000-0000-4000-8000-000000000003'::uuid, 'KATORI', 150),
    (4,  'f00d0000-0000-4000-8000-000000000004'::uuid, 'KATORI', 150),
    (5,  'f00d0000-0000-4000-8000-000000000005'::uuid, 'PIECE', 35),
    (6,  'f00d0000-0000-4000-8000-000000000006'::uuid, 'KATORI', 150),
    (7,  'f00d0000-0000-4000-8000-000000000007'::uuid, 'KATORI', 150),
    (8,  'f00d0000-0000-4000-8000-000000000008'::uuid, 'KATORI', 150),
    (9,  'f00d0000-0000-4000-8000-000000000009'::uuid, 'KATORI', 150),
    (10, 'f00d0000-0000-4000-8000-00000000000a'::uuid, 'KATORI', 150),
    (11, 'f00d0000-0000-4000-8000-00000000000b'::uuid, 'G', 120),
    (12, 'f00d0000-0000-4000-8000-00000000000c'::uuid, 'PIECE', 50),
    (13, 'f00d0000-0000-4000-8000-00000000000d'::uuid, 'PIECE', 100),
    (14, 'f00d0000-0000-4000-8000-00000000000e'::uuid, 'KATORI', 150),
    (15, 'f00d0000-0000-4000-8000-00000000000f'::uuid, 'KATORI', 150),
    (16, 'f00d0000-0000-4000-8000-000000000010'::uuid, 'GLASS', 200),
    (17, 'f00d0000-0000-4000-8000-000000000011'::uuid, 'PIECE', 120),
    (18, 'f00d0000-0000-4000-8000-000000000012'::uuid, 'PIECE', 150),
    (19, 'f00d0000-0000-4000-8000-000000000013'::uuid, 'PIECE', 60),
    (20, 'f00d0000-0000-4000-8000-000000000014'::uuid, 'PIECE', 30)
) as catalog (n, id, default_unit, piece_g)
cross join (
  values
    (1, 'G'::public.food_serving_unit, 'g', 1::numeric, 0),
    (2, 'ML', 'ml', 1, 1),
    (3, 'PIECE', 'piece', 1, 2),
    (4, 'KATORI', 'katori', 150, 3),
    (5, 'CUP', 'cup', 240, 4),
    (6, 'GLASS', 'glass', 200, 5),
    (7, 'TBSP', 'tbsp', 15, 6),
    (8, 'TSP', 'tsp', 5, 7)
) as units (n, unit, label, grams, sort_order)
on conflict (id) do nothing;

-- Bootstrap exercise catalog (mirrors 20260817121500_seed_exercise_catalog_v1.sql).
insert into public.exercise_items (
  id, name, aliases, primary_muscle, equipment, measurement, source, active
)
values
  ('e0e00000-0000-4000-8000-000000000001', 'Bench Press (Barbell)', array['bench', 'bb bench', 'flat bench']::varchar[], 'CHEST', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000002', 'Incline Press (Dumbbell)', array['incline db press', 'incline dumbbell press']::varchar[], 'CHEST', 'DUMBBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000003', 'Push-up', array['pushup', 'push ups']::varchar[], 'CHEST', 'BODYWEIGHT', 'REPS_ONLY', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000004', 'Chest Fly (Machine)', array['pec deck', 'pec fly', 'chest fly machine']::varchar[], 'CHEST', 'MACHINE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000005', 'Chest Fly (Cable)', array['cable fly', 'cable crossover']::varchar[], 'CHEST', 'CABLE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000006', 'Lat Pulldown (Cable)', array['lat pull', 'lat pulldown']::varchar[], 'LATS', 'CABLE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000007', 'Seated Row (Cable)', array['cable row', 'seated cable row']::varchar[], 'UPPER_BACK', 'CABLE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000008', 'Bent-Over Row (Barbell)', array['bb row', 'barbell row']::varchar[], 'UPPER_BACK', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000009', 'Pull-up', array['pullup', 'chin up']::varchar[], 'LATS', 'BODYWEIGHT', 'REPS_ONLY', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000000a', 'Assisted Pull-up', array['assisted pullup', 'machine pull-up']::varchar[], 'LATS', 'MACHINE', 'BODYWEIGHT_ASSISTED', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000000b', 'Back Squat (Barbell)', array['squat', 'bb squat']::varchar[], 'QUADS', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000000c', 'Leg Press', array['leg press machine']::varchar[], 'QUADS', 'MACHINE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000000d', 'Romanian Deadlift (Barbell)', array['rdl', 'barbell rdl']::varchar[], 'HAMSTRINGS', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000000e', 'Walking Lunge (Dumbbell)', array['db lunge', 'lunges']::varchar[], 'QUADS', 'DUMBBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000000f', 'Leg Extension', array['leg ext']::varchar[], 'QUADS', 'MACHINE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000010', 'Leg Curl (Machine)', array['lying leg curl', 'seated leg curl', 'ham curl']::varchar[], 'HAMSTRINGS', 'MACHINE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000011', 'Standing Calf Raise', array['calf raise', 'calves']::varchar[], 'CALVES', 'MACHINE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000012', 'Hip Thrust (Barbell)', array['hip thrust', 'glute bridge barbell']::varchar[], 'GLUTES', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000013', 'Overhead Press (Barbell)', array['ohp', 'military press', 'bb press']::varchar[], 'SHOULDERS', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000014', 'Shoulder Press (Dumbbell)', array['db shoulder press', 'dumbbell ohp']::varchar[], 'SHOULDERS', 'DUMBBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000015', 'Lateral Raise (Dumbbell)', array['side raise', 'db lateral raise']::varchar[], 'SHOULDERS', 'DUMBBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000016', 'Bicep Curl (Barbell)', array['bb curl', 'barbell curl']::varchar[], 'BICEPS', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000017', 'Bicep Curl (Dumbbell)', array['db curl', 'dumbbell curl']::varchar[], 'BICEPS', 'DUMBBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000018', 'Tricep Pushdown (Cable)', array['pushdown', 'tricep pressdown']::varchar[], 'TRICEPS', 'CABLE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-000000000019', 'Lying Tricep Extension (Barbell)', array['skull crusher', 'skullcrusher']::varchar[], 'TRICEPS', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000001a', 'Plank', array['front plank', 'planks']::varchar[], 'CORE', 'BODYWEIGHT', 'DURATION', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000001b', 'Crunch', array['crunches', 'sit up']::varchar[], 'CORE', 'BODYWEIGHT', 'REPS_ONLY', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000001c', 'Deadlift (Barbell)', array['conventional deadlift', 'dl']::varchar[], 'FULL_BODY', 'BARBELL', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000001d', 'Face Pull (Cable)', array['facepull', 'rear delt cable']::varchar[], 'SHOULDERS', 'CABLE', 'WEIGHT_REPS', 'seed', true),
  ('e0e00000-0000-4000-8000-00000000001e', 'Goblet Squat (Dumbbell)', array['goblet', 'db goblet squat']::varchar[], 'QUADS', 'DUMBBELL', 'WEIGHT_REPS', 'seed', true)
on conflict (id) do nothing;
