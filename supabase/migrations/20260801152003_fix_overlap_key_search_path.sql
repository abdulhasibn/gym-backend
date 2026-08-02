-- Harden trigger function search_path (advisor: function_search_path_mutable)

create or replace function public.subscriptions_set_overlap_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'BASE' then
    new.overlap_key := '';
  else
    new.overlap_key := new.capability::text;
  end if;
  return new;
end;
$$;
