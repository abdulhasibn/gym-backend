-- Atomically creates an organisation and its owner affiliations.
-- The function is service_role-only; application authorization remains the
-- authoritative boundary before invoking it.
create or replace function public.create_owned_gym_org(
  p_owner_user_id uuid,
  p_name varchar,
  p_address text default null,
  p_contact_phone varchar default null,
  p_contact_email varchar default null,
  p_logo_url text default null,
  p_timezone varchar default 'Asia/Kolkata'
)
returns public.gym_orgs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_staff_unassigned_role_id uuid;
  v_admin_role_id uuid;
  v_current_role_id uuid;
  v_gym_org public.gym_orgs;
begin
  select id into v_staff_unassigned_role_id
  from public.roles
  where code = 'STAFF_UNASSIGNED';

  select id into v_admin_role_id
  from public.roles
  where code = 'ADMIN';

  if v_staff_unassigned_role_id is null or v_admin_role_id is null then
    raise exception 'Required frozen roles are missing';
  end if;

  select role_id into v_current_role_id
  from public.users
  where id = p_owner_user_id
    and deleted_at is null
  for update;

  if v_current_role_id is null then
    raise exception 'Owner account does not exist or is deleted';
  end if;

  if v_current_role_id not in (v_staff_unassigned_role_id, v_admin_role_id) then
    raise exception 'Owner account is not allowed to create an organisation';
  end if;

  if v_current_role_id = v_staff_unassigned_role_id then
    update public.users
    set role_id = v_admin_role_id,
        updated_at = now()
    where id = p_owner_user_id;
  end if;

  insert into public.gym_orgs (
    name,
    address,
    contact_phone,
    contact_email,
    logo_url,
    timezone,
    owner_user_id
  )
  values (
    p_name,
    p_address,
    p_contact_phone,
    p_contact_email,
    p_logo_url,
    p_timezone,
    p_owner_user_id
  )
  returning * into v_gym_org;

  insert into public.gym_admins (user_id, gym_org_id, is_owner)
  values (p_owner_user_id, v_gym_org.id, true);

  insert into public.trainer_profiles (user_id, gym_org_id)
  values (p_owner_user_id, v_gym_org.id);

  return v_gym_org;
end;
$$;

revoke all on function public.create_owned_gym_org(
  uuid,
  varchar,
  text,
  varchar,
  varchar,
  text,
  varchar
) from public, anon, authenticated;

grant execute on function public.create_owned_gym_org(
  uuid,
  varchar,
  text,
  varchar,
  varchar,
  text,
  varchar
) to service_role;
