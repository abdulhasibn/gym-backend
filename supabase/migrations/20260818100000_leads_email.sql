-- Optional email on gym-owned leads (A14 convert). Nullable so walk-in
-- capture still works without an address. Not unique — same as phone.

alter table public.leads
  add column email varchar;

comment on column public.leads.email is
  'Optional prospect email. Required to convert to a membership invite (body may supply it).';
