-- Atomically accepts a PENDING membership invite: creates ACTIVE client_membership,
-- base (± addon) subscription snapshots, required + optional grants, marks invite ACCEPTED.
-- service_role-only; application authorization remains the authoritative boundary.
create or replace function public.accept_membership_invite(
  p_invite_id uuid,
  p_user_id uuid,
  p_optional_profile_attributes public.profile_attribute[] default '{}',
  p_optional_class_grants public.data_grant_class[] default '{}'
)
returns public.membership_invites
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invite public.membership_invites;
  v_user_email text;
  v_role_code text;
  v_gym_timezone text;
  v_local_today date;
  v_membership_id uuid;
  v_base_plan public.membership_plans;
  v_addon_plan public.membership_plans;
  v_base_amount_paid numeric(12, 2);
  v_addon_amount_paid numeric(12, 2);
  v_addon_end date;
  v_required_attrs public.profile_attribute[] := array[
    'DOB'::public.profile_attribute,
    'HEIGHT'::public.profile_attribute,
    'WEIGHT'::public.profile_attribute
  ];
begin
  select * into v_invite
  from public.membership_invites
  where id = p_invite_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Membership invite not found';
  end if;

  if v_invite.status <> 'PENDING' then
    raise exception 'Membership invite is not pending';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    update public.membership_invites
    set status = 'EXPIRED',
        updated_at = now()
    where id = v_invite.id;
    raise exception 'Membership invite has expired';
  end if;

  select u.email, r.code
    into v_user_email, v_role_code
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = p_user_id
    and u.deleted_at is null
  for update of u;

  if not found then
    raise exception 'Invitee account does not exist or is deleted';
  end if;

  if v_role_code <> 'CLIENT' then
    raise exception 'Only CLIENT accounts can accept membership invites';
  end if;

  if v_invite.invited_user_id is not null then
    if v_invite.invited_user_id <> p_user_id then
      raise exception 'Membership invite is not addressed to this user';
    end if;
  elsif lower(v_invite.invited_email) <> lower(v_user_email) then
    raise exception 'Membership invite is not addressed to this user';
  end if;

  if exists (
    select 1
    from public.client_memberships
    where client_user_id = p_user_id
      and status = 'ACTIVE'
      and deleted_at is null
  ) then
    raise exception 'Client already has an ACTIVE membership';
  end if;

  select timezone into v_gym_timezone
  from public.gym_orgs
  where id = v_invite.gym_org_id
    and deleted_at is null;

  if v_gym_timezone is null then
    raise exception 'Gym organization not found';
  end if;

  v_local_today := (now() at time zone v_gym_timezone)::date;

  select * into v_base_plan
  from public.membership_plans
  where id = v_invite.base_plan_id
    and gym_org_id = v_invite.gym_org_id
    and deleted_at is null
    and active = true
    and kind = 'BASE'
  for share;

  if not found then
    raise exception 'Base plan is not available';
  end if;

  if v_invite.addon_plan_id is not null then
    select * into v_addon_plan
    from public.membership_plans
    where id = v_invite.addon_plan_id
      and gym_org_id = v_invite.gym_org_id
      and deleted_at is null
      and active = true
      and kind = 'ADDON'
      and capability = 'TRAINER_COACHING'
    for share;

    if not found then
      raise exception 'Addon plan is not available';
    end if;
  end if;

  insert into public.client_memberships (
    client_user_id,
    gym_org_id,
    status,
    check_in_blocked,
    source_invite_id,
    joined_at
  )
  values (
    p_user_id,
    v_invite.gym_org_id,
    'ACTIVE',
    false,
    v_invite.id,
    now()
  )
  returning id into v_membership_id;

  v_base_amount_paid := case v_invite.base_payment_status
    when 'paid' then v_base_plan.price
    when 'unpaid' then 0
    else
      case
        when v_base_plan.price <= 0.02 then 0.01
        else round(v_base_plan.price / 2, 2)
      end
  end;

  insert into public.subscriptions (
    client_membership_id,
    gym_org_id,
    plan_id,
    kind,
    capability,
    price_amount,
    duration_days,
    start_date,
    end_date,
    start_source,
    payment_status,
    amount_paid
  )
  values (
    v_membership_id,
    v_invite.gym_org_id,
    v_base_plan.id,
    'BASE',
    null,
    v_base_plan.price,
    v_base_plan.duration_days,
    null,
    null,
    null,
    v_invite.base_payment_status,
    v_base_amount_paid
  );

  if v_invite.addon_plan_id is not null then
    v_addon_amount_paid := case v_invite.addon_payment_status
      when 'paid' then v_addon_plan.price
      when 'unpaid' then 0
      else
        case
          when v_addon_plan.price <= 0.02 then 0.01
          else round(v_addon_plan.price / 2, 2)
        end
    end;

    v_addon_end := v_local_today + (v_addon_plan.duration_days - 1);

    insert into public.subscriptions (
      client_membership_id,
      gym_org_id,
      plan_id,
      kind,
      capability,
      price_amount,
      duration_days,
      start_date,
      end_date,
      start_source,
      payment_status,
      amount_paid
    )
    values (
      v_membership_id,
      v_invite.gym_org_id,
      v_addon_plan.id,
      'ADDON',
      v_addon_plan.capability,
      v_addon_plan.price,
      v_addon_plan.duration_days,
      v_local_today,
      v_addon_end,
      'ADMIN_ATTACH',
      v_invite.addon_payment_status,
      v_addon_amount_paid
    );
  end if;

  insert into public.profile_attribute_grants (client_user_id, gym_org_id, attribute)
  select p_user_id, v_invite.gym_org_id, attr
  from unnest(v_required_attrs) as attr;

  if p_optional_profile_attributes is not null then
    insert into public.profile_attribute_grants (client_user_id, gym_org_id, attribute)
    select distinct p_user_id, v_invite.gym_org_id, attr
    from unnest(p_optional_profile_attributes) as attr
    where attr <> all (v_required_attrs)
    on conflict (client_user_id, gym_org_id, attribute) where deleted_at is null
    do nothing;
  end if;

  if p_optional_class_grants is not null then
    insert into public.data_grants (client_user_id, gym_org_id, class)
    select distinct p_user_id, v_invite.gym_org_id, cls
    from unnest(p_optional_class_grants) as cls
    on conflict (client_user_id, gym_org_id, class) where deleted_at is null
    do nothing;
  end if;

  update public.membership_invites
  set status = 'ACCEPTED',
      accepted_at = now(),
      accepted_membership_id = v_membership_id,
      invited_user_id = coalesce(invited_user_id, p_user_id),
      updated_at = now()
  where id = v_invite.id
  returning * into v_invite;

  return v_invite;
end;
$$;

revoke all on function public.accept_membership_invite(
  uuid,
  uuid,
  public.profile_attribute[],
  public.data_grant_class[]
) from public, anon, authenticated;

grant execute on function public.accept_membership_invite(
  uuid,
  uuid,
  public.profile_attribute[],
  public.data_grant_class[]
) to service_role;
