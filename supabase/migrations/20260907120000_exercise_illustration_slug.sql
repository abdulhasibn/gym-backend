-- Add illustration_slug to exercise_items (ADR-0007 demo-asset deferral, now landing).
-- Slug references @bryllim/workout-guide@1.0.0 (CC BY-SA 4.0).
-- CDN pattern: https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/<slug>/frame-<1|2|3>.svg
-- Research: docs/research-workout-guide.md

alter table public.exercise_items
  add column illustration_slug varchar(120) null;

comment on column public.exercise_items.illustration_slug is
  'Slug key into @bryllim/workout-guide@1.0.0. CDN: cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/<slug>/frame-<1|2|3>.svg. Attribution: Everkinetic & Bryl Lim, CC BY-SA 4.0.';

-- Update the 30 bootstrap seed rows with their curated illustration slugs.
-- Mapping source: docs/research-workout-guide.md §4.
update public.exercise_items set illustration_slug = 'bench-press'           where id = 'e0e00000-0000-4000-8000-000000000001';
update public.exercise_items set illustration_slug = 'incline-dumbbell-press' where id = 'e0e00000-0000-4000-8000-000000000002';
update public.exercise_items set illustration_slug = 'push-up'               where id = 'e0e00000-0000-4000-8000-000000000003';
update public.exercise_items set illustration_slug = 'pec-deck'              where id = 'e0e00000-0000-4000-8000-000000000004';
update public.exercise_items set illustration_slug = 'cable-fly'             where id = 'e0e00000-0000-4000-8000-000000000005';
update public.exercise_items set illustration_slug = 'lat-pulldown'          where id = 'e0e00000-0000-4000-8000-000000000006';
update public.exercise_items set illustration_slug = 'seated-row'            where id = 'e0e00000-0000-4000-8000-000000000007';
update public.exercise_items set illustration_slug = 'barbell-row'           where id = 'e0e00000-0000-4000-8000-000000000008';
update public.exercise_items set illustration_slug = 'pull-up'               where id = 'e0e00000-0000-4000-8000-000000000009';
update public.exercise_items set illustration_slug = 'assisted-pull-up'      where id = 'e0e00000-0000-4000-8000-00000000000a';
update public.exercise_items set illustration_slug = 'squat'                 where id = 'e0e00000-0000-4000-8000-00000000000b';
update public.exercise_items set illustration_slug = 'leg-press'             where id = 'e0e00000-0000-4000-8000-00000000000c';
update public.exercise_items set illustration_slug = 'romanian-deadlift'     where id = 'e0e00000-0000-4000-8000-00000000000d';
update public.exercise_items set illustration_slug = 'walking-lunge'         where id = 'e0e00000-0000-4000-8000-00000000000e';
update public.exercise_items set illustration_slug = 'leg-extension'         where id = 'e0e00000-0000-4000-8000-00000000000f';
update public.exercise_items set illustration_slug = 'leg-curl'              where id = 'e0e00000-0000-4000-8000-000000000010';
update public.exercise_items set illustration_slug = 'standing-calf-raise'   where id = 'e0e00000-0000-4000-8000-000000000011';
update public.exercise_items set illustration_slug = 'hip-thrust'            where id = 'e0e00000-0000-4000-8000-000000000012';
update public.exercise_items set illustration_slug = 'overhead-press'        where id = 'e0e00000-0000-4000-8000-000000000013';
update public.exercise_items set illustration_slug = 'seated-dumbbell-press' where id = 'e0e00000-0000-4000-8000-000000000014';
update public.exercise_items set illustration_slug = 'lateral-raise'         where id = 'e0e00000-0000-4000-8000-000000000015';
update public.exercise_items set illustration_slug = 'ez-bar-curl'           where id = 'e0e00000-0000-4000-8000-000000000016';
update public.exercise_items set illustration_slug = 'bicep-curl'            where id = 'e0e00000-0000-4000-8000-000000000017';
update public.exercise_items set illustration_slug = 'tricep-pushdown'       where id = 'e0e00000-0000-4000-8000-000000000018';
update public.exercise_items set illustration_slug = 'skull-crusher'         where id = 'e0e00000-0000-4000-8000-000000000019';
update public.exercise_items set illustration_slug = 'plank'                 where id = 'e0e00000-0000-4000-8000-00000000001a';
update public.exercise_items set illustration_slug = 'crunch'                where id = 'e0e00000-0000-4000-8000-00000000001b';
update public.exercise_items set illustration_slug = 'deadlift'              where id = 'e0e00000-0000-4000-8000-00000000001c';
update public.exercise_items set illustration_slug = 'face-pull'             where id = 'e0e00000-0000-4000-8000-00000000001d';
update public.exercise_items set illustration_slug = 'goblet-squat'          where id = 'e0e00000-0000-4000-8000-00000000001e';
