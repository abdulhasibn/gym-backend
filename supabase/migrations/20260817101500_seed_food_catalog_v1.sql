-- Shared unit picker on every serving + 20-food bootstrap catalog (typical-cook).
-- Empty servings table: adding NOT NULL unit is safe. Coverage grows in a later seed.

create type public.food_serving_unit as enum (
  'G',
  'ML',
  'PIECE',
  'KATORI',
  'CUP',
  'GLASS',
  'TBSP',
  'TSP'
);

comment on type public.food_serving_unit is
  'Frozen HealthifyMe-style picker. Same labels/order on every food; grams are per food.';

alter table public.food_item_servings
  add column unit public.food_serving_unit not null;

drop index public.food_item_servings_label_live_uidx;

create unique index food_item_servings_unit_live_uidx
  on public.food_item_servings (food_item_id, unit)
  where deleted_at is null;

comment on column public.food_item_servings.unit is
  'Frozen unit key. Label is denormalized display.';
comment on column public.food_item_servings.label is
  'Display label from unit (g, piece, katori, …).';
comment on table public.food_item_servings is
  'Named portion. Live unique (food_item_id, unit). At most one live default per food. CHECK grams > 0.';

-- Platform-vetted bootstrap (macros per 100 g, typical-cook — not user input).
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
