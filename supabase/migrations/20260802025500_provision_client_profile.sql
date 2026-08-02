-- Provision the required ClientOwned profile atomically with a CLIENT account.
-- This trigger is intentionally SECURITY INVOKER; application authorization
-- remains in the API and RLS remains enabled on the target table.

create function public.create_client_profile_for_client()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.roles
    where id = new.role_id
      and code = 'CLIENT'
  ) then
    insert into public.client_profiles (user_id)
    values (new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.create_client_profile_for_client() from public;

create trigger users_provision_client_profile
after insert on public.users
for each row
execute function public.create_client_profile_for_client();
