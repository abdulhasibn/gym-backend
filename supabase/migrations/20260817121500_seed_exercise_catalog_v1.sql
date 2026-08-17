-- 30-movement Indian commercial-gym bootstrap (ADR-0007).
-- Name = movement (equipment). One row per identity. Coverage grows later.

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
