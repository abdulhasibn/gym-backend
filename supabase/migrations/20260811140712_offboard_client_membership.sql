-- Atomically offboards an ACTIVE client membership: status → INACTIVE, set left_at,
-- soft-delete all profile_attribute_grants + data_grants for (client, gym).
-- service_role-only; application authorization remains the authoritative boundary.
create or replace function public.offboard_client_membership(
  p_membership_id uuid,
  p_gym_org_id uuid,
  p_now timestamptz default now()
)
returns public.client_memberships
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_membership public.client_memberships;
begin
  select * into v_membership
  from public.client_memberships
  where id = p_membership_id
    and gym_org_id = p_gym_org_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Client membership not found';
  end if;

  if v_membership.status <> 'ACTIVE' then
    raise exception 'Client membership is not active';
  end if;

  update public.profile_attribute_grants
  set deleted_at = p_now
  where client_user_id = v_membership.client_user_id
    and gym_org_id = v_membership.gym_org_id
    and deleted_at is null;

  update public.data_grants
  set deleted_at = p_now
  where client_user_id = v_membership.client_user_id
    and gym_org_id = v_membership.gym_org_id
    and deleted_at is null;

  update public.client_memberships
  set status = 'INACTIVE',
      left_at = p_now,
      updated_at = p_now
  where id = v_membership.id
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke all on function public.offboard_client_membership(uuid, uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.offboard_client_membership(uuid, uuid, timestamptz)
  to service_role;
