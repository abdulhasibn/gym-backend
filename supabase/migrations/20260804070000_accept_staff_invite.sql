-- Atomically accepts a PENDING staff invite: upgrades role (never downgrades),
-- inserts trainer_profiles and/or gym_admins, marks invite ACCEPTED.
-- service_role-only; application authorization remains the authoritative boundary.
create or replace function public.accept_staff_invite(
  p_invite_id uuid,
  p_user_id uuid
)
returns public.staff_invites
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invite public.staff_invites;
  v_staff_unassigned_role_id uuid;
  v_trainer_role_id uuid;
  v_admin_role_id uuid;
  v_current_role_id uuid;
  v_current_role_code text;
  v_target_role_id uuid;
begin
  select id into v_staff_unassigned_role_id from public.roles where code = 'STAFF_UNASSIGNED';
  select id into v_trainer_role_id from public.roles where code = 'TRAINER';
  select id into v_admin_role_id from public.roles where code = 'ADMIN';

  if v_staff_unassigned_role_id is null
     or v_trainer_role_id is null
     or v_admin_role_id is null then
    raise exception 'Required frozen roles are missing';
  end if;

  select * into v_invite
  from public.staff_invites
  where id = p_invite_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Staff invite not found';
  end if;

  if v_invite.invited_user_id <> p_user_id then
    raise exception 'Staff invite is not addressed to this user';
  end if;

  if v_invite.status <> 'PENDING' then
    raise exception 'Staff invite is not pending';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    update public.staff_invites
    set status = 'EXPIRED',
        updated_at = now()
    where id = v_invite.id;
    raise exception 'Staff invite has expired';
  end if;

  select u.role_id, r.code
    into v_current_role_id, v_current_role_code
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = p_user_id
    and u.deleted_at is null
  for update of u;

  if not found then
    raise exception 'Invitee account does not exist or is deleted';
  end if;

  if v_current_role_code = 'CLIENT' then
    raise exception 'Client accounts cannot accept staff invites';
  end if;

  if v_invite.target_role = 'ADMIN' then
    v_target_role_id := v_admin_role_id;
  else
    v_target_role_id := v_trainer_role_id;
  end if;

  -- Role upgrade only: never downgrade ADMIN → TRAINER.
  if v_current_role_code = 'STAFF_UNASSIGNED'
     or (v_current_role_code = 'TRAINER' and v_invite.target_role = 'ADMIN') then
    update public.users
    set role_id = v_target_role_id,
        updated_at = now()
    where id = p_user_id;
  end if;

  if v_invite.target_role = 'ADMIN'
     and not exists (
       select 1
       from public.gym_admins
       where user_id = p_user_id
         and gym_org_id = v_invite.gym_org_id
         and deleted_at is null
     ) then
    insert into public.gym_admins (user_id, gym_org_id, is_owner)
    values (p_user_id, v_invite.gym_org_id, false);
  end if;

  if not exists (
    select 1
    from public.trainer_profiles
    where user_id = p_user_id
      and gym_org_id = v_invite.gym_org_id
      and deleted_at is null
  ) then
    insert into public.trainer_profiles (user_id, gym_org_id)
    values (p_user_id, v_invite.gym_org_id);
  end if;

  update public.staff_invites
  set status = 'ACCEPTED',
      accepted_at = now(),
      updated_at = now()
  where id = v_invite.id
  returning * into v_invite;

  return v_invite;
end;
$$;

revoke all on function public.accept_staff_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_staff_invite(uuid, uuid) to service_role;
