import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { CreateMembershipInviteUseCase } from '../../application/create-membership-invite.use-case';
import { CreateMembershipPlanUseCase } from '../../application/create-membership-plan.use-case';
import { InvalidInvitePlanError } from '../../application/invalid-invite-plan.error';
import { InvalidMembershipInviteeError } from '../../application/invalid-membership-invitee.error';
import { ListMembershipInvitesUseCase } from '../../application/list-membership-invites.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { PlanForbiddenError } from '../../application/plan-forbidden.error';
import { RevokeMembershipInviteUseCase } from '../../application/revoke-membership-invite.use-case';
import { DurationDays } from '../../domain/duration-days.value-object';
import { InviteeEmail } from '../../domain/invitee-email.value-object';
import { InviteeName } from '../../domain/invitee-name.value-object';
import { MembershipInviteInvalidTransitionError } from '../../domain/membership-invite-invalid-transition.error';
import { toMembershipInviteId } from '../../domain/membership-invite-id';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanName } from '../../domain/plan-name.value-object';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryClientUserLookup } from '../fakes/in-memory-client-user-lookup';
import { InMemoryMembershipInviteStore } from '../fakes/in-memory-membership-invite.repository';
import { InMemoryMembershipPlanStore } from '../fakes/in-memory-membership-plan.repository';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminId = toUserId('11111111-1111-4111-8111-111111111111');
const clientId = toUserId('22222222-2222-4222-8222-222222222222');
const staffId = toUserId('33333333-3333-4333-8333-333333333333');

function adminActor(roleCode: AuthenticatedActor['roleCode'] = 'ADMIN'): AuthenticatedActor {
  return {
    userId: adminId,
    roleCode,
    lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
    email: 'admin@example.com',
    staffCode: 'STF-ADMIN',
  };
}

async function setup() {
  const plans = new InMemoryMembershipPlanStore();
  const invites = new InMemoryMembershipInviteStore();
  const clientUsers = new InMemoryClientUserLookup();
  const admins = new FixedLiveGymAdmin();
  admins.seed(adminId, gymOrgId);
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-08T00:00:00.000Z'));
  invites.setNow(clock.now());
  let n = 0;
  const ids = {
    generate: () => {
      n += 1;
      return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
    },
  };

  const createPlan = new CreateMembershipPlanUseCase(plans, policy, clock, ids);
  const base = await createPlan.execute(adminActor(), {
    gymOrgId,
    name: PlanName.create('Monthly'),
    kind: 'BASE',
    capability: null,
    durationDays: DurationDays.create(30),
    price: PlanPrice.create(999),
  });
  const addon = await createPlan.execute(adminActor(), {
    gymOrgId,
    name: PlanName.create('PT'),
    kind: 'ADDON',
    capability: 'TRAINER_COACHING',
    durationDays: DurationDays.create(30),
    price: PlanPrice.create(1500),
  });

  return {
    plans,
    invites,
    clientUsers,
    clock,
    create: new CreateMembershipInviteUseCase(policy, invites, plans, clientUsers, clock, ids),
    list: new ListMembershipInvitesUseCase(policy, invites),
    revoke: new RevokeMembershipInviteUseCase(policy, invites, clock),
    basePlanId: toMembershipPlanId(base.id),
    addonPlanId: toMembershipPlanId(addon.id),
  };
}

describe('membership invite use cases', () => {
  it('creates invite with optional addon and resolves CLIENT email', async () => {
    const { create, list, clientUsers, basePlanId, addonPlanId } = await setup();
    clientUsers.seed('client@example.com', {
      userId: clientId,
      roleCode: 'CLIENT',
      lane: 'CLIENT',
    });

    const invite = await create.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('Alex'),
      invitedEmail: InviteeEmail.create('Client@Example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'paid',
      addonPlanId,
      addonPaymentStatus: 'unpaid',
    });

    expect(invite.status).toBe('PENDING');
    expect(invite.invitedEmail).toBe('client@example.com');
    expect(invite.invitedUserId).toBe(clientId);
    expect(invite.addonPlanId).toBe(addonPlanId);
    expect(invite.expiresAt).toBe('2026-08-22T00:00:00.000Z');

    const listed = await list.execute(adminActor(), gymOrgId, { limit: 20, offset: 0 });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.id).toBe(invite.id);
  });

  it('leaves invitedUserId null when email has no user', async () => {
    const { create, basePlanId } = await setup();
    const invite = await create.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('New'),
      invitedEmail: InviteeEmail.create('new@example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
    });
    expect(invite.invitedUserId).toBeNull();
  });

  it('rejects STAFF email invitees', async () => {
    const { create, clientUsers, basePlanId } = await setup();
    clientUsers.seed('staff@example.com', {
      userId: staffId,
      roleCode: 'TRAINER',
      lane: 'STAFF',
    });

    await expect(
      create.execute(adminActor(), {
        gymOrgId,
        inviteeName: InviteeName.create('Staff'),
        invitedEmail: InviteeEmail.create('staff@example.com'),
        inviteePhone: null,
        basePlanId,
        basePaymentStatus: 'unpaid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(InvalidMembershipInviteeError);
  });

  it('rejects inactive or wrong-kind plans', async () => {
    const { create, plans, basePlanId, addonPlanId } = await setup();
    const base = await plans.findById(gymOrgId, basePlanId);
    base?.updateProfile(
      {
        name: PlanName.create('Monthly'),
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(999),
        active: false,
      },
      new Date(),
    );
    if (base) await plans.save(base);

    await expect(
      create.execute(adminActor(), {
        gymOrgId,
        inviteeName: InviteeName.create('Alex'),
        invitedEmail: InviteeEmail.create('a@example.com'),
        inviteePhone: null,
        basePlanId,
        basePaymentStatus: 'unpaid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(InvalidInvitePlanError);

    await expect(
      create.execute(adminActor(), {
        gymOrgId,
        inviteeName: InviteeName.create('Alex'),
        invitedEmail: InviteeEmail.create('b@example.com'),
        inviteePhone: null,
        basePlanId: addonPlanId,
        basePaymentStatus: 'unpaid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(InvalidInvitePlanError);
  });

  it('revokes pending invites and forbids non-admins', async () => {
    const { create, revoke, basePlanId } = await setup();
    const invite = await create.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('Alex'),
      invitedEmail: InviteeEmail.create('c@example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
    });

    const revoked = await revoke.execute(adminActor(), gymOrgId, toMembershipInviteId(invite.id));
    expect(revoked.status).toBe('REVOKED');

    await expect(
      revoke.execute(adminActor(), gymOrgId, toMembershipInviteId(invite.id)),
    ).rejects.toBeInstanceOf(MembershipInviteInvalidTransitionError);

    await expect(
      create.execute(adminActor('TRAINER'), {
        gymOrgId,
        inviteeName: InviteeName.create('X'),
        invitedEmail: InviteeEmail.create('x@example.com'),
        inviteePhone: null,
        basePlanId,
        basePaymentStatus: 'unpaid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(PlanForbiddenError);
  });
});
