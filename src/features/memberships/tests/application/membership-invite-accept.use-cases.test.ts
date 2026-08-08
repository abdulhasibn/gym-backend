import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { AcceptMembershipInviteUseCase } from '../../application/accept-membership-invite.use-case';
import { ActiveMembershipConflictError } from '../../application/active-membership-conflict.error';
import { CreateMembershipInviteUseCase } from '../../application/create-membership-invite.use-case';
import { CreateMembershipPlanUseCase } from '../../application/create-membership-plan.use-case';
import { GetMyDataGrantsUseCase } from '../../application/get-my-data-grants.use-case';
import { ListMyMembershipInviteInboxUseCase } from '../../application/list-my-membership-invite-inbox.use-case';
import { MembershipInviteExpiredError } from '../../application/membership-invite-expired.error';
import { MembershipInviteForbiddenError } from '../../application/membership-invite-forbidden.error';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { UpdateMyDataGrantsUseCase } from '../../application/update-my-data-grants.use-case';
import { DurationDays } from '../../domain/duration-days.value-object';
import { InviteeEmail } from '../../domain/invitee-email.value-object';
import { InviteeName } from '../../domain/invitee-name.value-object';
import { MembershipInvite } from '../../domain/membership-invite.entity';
import { toMembershipInviteId } from '../../domain/membership-invite-id';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanName } from '../../domain/plan-name.value-object';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryClientMembershipStore } from '../fakes/in-memory-client-membership.repository';
import { InMemoryClientUserLookup } from '../fakes/in-memory-client-user-lookup';
import { InMemoryDataGrantStore } from '../fakes/in-memory-data-grant.store';
import { InMemoryMembershipInviteStore } from '../fakes/in-memory-membership-invite.repository';
import { InMemoryMembershipPlanStore } from '../fakes/in-memory-membership-plan.repository';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminId = toUserId('11111111-1111-4111-8111-111111111111');
const clientId = toUserId('22222222-2222-4222-8222-222222222222');

function clientActor(email = 'client@example.com'): AuthenticatedActor {
  return {
    userId: clientId,
    roleCode: 'CLIENT',
    lane: 'CLIENT',
    email,
    staffCode: null,
  };
}

function adminActor(): AuthenticatedActor {
  return {
    userId: adminId,
    roleCode: 'ADMIN',
    lane: 'STAFF',
    email: 'admin@example.com',
    staffCode: 'STF-ADMIN',
  };
}

async function setup() {
  const plans = new InMemoryMembershipPlanStore();
  const invites = new InMemoryMembershipInviteStore();
  const clientUsers = new InMemoryClientUserLookup();
  const memberships = new InMemoryClientMembershipStore();
  const grants = new InMemoryDataGrantStore();
  const admins = new FixedLiveGymAdmin();
  admins.seed(adminId, gymOrgId);
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-08T00:00:00.000Z'));
  invites.setNow(clock.now());
  invites.seedGymProfile({
    id: gymOrgId,
    name: 'North Star',
    address: null,
    contactPhone: null,
    contactEmail: null,
    logoUrl: null,
    timezone: 'Asia/Kolkata',
  });

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

  const createInvite = new CreateMembershipInviteUseCase(
    policy,
    invites,
    plans,
    clientUsers,
    clock,
    ids,
  );

  return {
    invites,
    memberships,
    grants,
    clock,
    createInvite,
    accept: new AcceptMembershipInviteUseCase(invites, clock),
    inbox: new ListMyMembershipInviteInboxUseCase(invites),
    getGrants: new GetMyDataGrantsUseCase(grants),
    updateGrants: new UpdateMyDataGrantsUseCase(memberships, grants, clock),
    basePlanId: toMembershipPlanId(base.id),
    clientUsers,
  };
}

describe('membership invite accept + grants use cases', () => {
  it('lists inbox and accepts with required + optional grants', async () => {
    const { createInvite, accept, inbox, basePlanId, clientUsers } = await setup();
    clientUsers.seed('client@example.com', {
      userId: clientId,
      roleCode: 'CLIENT',
      lane: 'CLIENT',
    });

    const invite = await createInvite.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('Alex'),
      invitedEmail: InviteeEmail.create('client@example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
      expiresAt: undefined,
    });

    const page = await inbox.execute(clientActor(), { limit: 20, offset: 0 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.gym.name).toBe('North Star');

    const result = await accept.execute(clientActor(), toMembershipInviteId(invite.id), {
      optionalProfileAttributes: ['GENDER'],
      optionalClassGrants: ['PROGRESS'],
    });

    expect(result.membershipInvite.status).toBe('ACCEPTED');
    expect(result.membershipId).toBeTruthy();
    expect(result.grants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'GENDER']),
    );
    expect(result.grants.classGrants).toEqual(['PROGRESS']);
  });

  it('rejects staff lane, wrong addressee, expired, and active conflict', async () => {
    const { createInvite, accept, invites, clock, basePlanId } = await setup();

    const invite = await createInvite.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('Alex'),
      invitedEmail: InviteeEmail.create('client@example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
      expiresAt: undefined,
    });

    await expect(
      accept.execute(adminActor(), toMembershipInviteId(invite.id), {
        optionalProfileAttributes: [],
        optionalClassGrants: [],
      }),
    ).rejects.toBeInstanceOf(MembershipInviteForbiddenError);

    await expect(
      accept.execute(clientActor('other@example.com'), toMembershipInviteId(invite.id), {
        optionalProfileAttributes: [],
        optionalClassGrants: [],
      }),
    ).rejects.toBeInstanceOf(MembershipInviteForbiddenError);

    const stored = await invites.findById(toMembershipInviteId(invite.id));
    expect(stored).not.toBeNull();
    if (stored === null) {
      throw new Error('expected invite');
    }
    stored.revoke(clock.now());
    await invites.save(stored);

    const fresh = await createInvite.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('Alex'),
      invitedEmail: InviteeEmail.create('client@example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
      expiresAt: undefined,
    });

    // Force expiry past clock without going through create validation.
    const pending = await invites.findById(toMembershipInviteId(fresh.id));
    expect(pending).not.toBeNull();
    if (pending === null) {
      throw new Error('expected pending invite');
    }
    const expired = MembershipInvite.reconstitute({
      id: pending.id,
      gymOrgId: pending.gymOrgId,
      invitedEmail: pending.invitedEmail,
      invitedUserId: pending.invitedUserId,
      inviteeName: pending.inviteeName,
      inviteePhone: pending.inviteePhone,
      basePlanId: pending.basePlanId,
      basePaymentStatus: pending.basePaymentStatus,
      addonPlanId: pending.addonPlanId,
      addonPaymentStatus: pending.addonPaymentStatus,
      status: pending.status,
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      createdBy: pending.createdBy,
      acceptedAt: pending.acceptedAt,
      acceptedMembershipId: pending.acceptedMembershipId,
      deletedAt: pending.deletedAt,
      createdAt: pending.createdAt,
      updatedAt: pending.updatedAt,
    });
    await invites.save(expired);

    await expect(
      accept.execute(clientActor(), toMembershipInviteId(fresh.id), {
        optionalProfileAttributes: [],
        optionalClassGrants: [],
      }),
    ).rejects.toBeInstanceOf(MembershipInviteExpiredError);

    const open = await createInvite.execute(adminActor(), {
      gymOrgId,
      inviteeName: InviteeName.create('Alex'),
      invitedEmail: InviteeEmail.create('client@example.com'),
      inviteePhone: null,
      basePlanId,
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
      expiresAt: undefined,
    });
    invites.seedActiveMembership(clientId);

    await expect(
      accept.execute(clientActor(), toMembershipInviteId(open.id), {
        optionalProfileAttributes: [],
        optionalClassGrants: [],
      }),
    ).rejects.toBeInstanceOf(ActiveMembershipConflictError);
  });

  it('gets and updates optional grants while keeping required sticky', async () => {
    const { memberships, grants, getGrants, updateGrants } = await setup();
    memberships.seedActive(clientId, gymOrgId);
    grants.seedActiveMembership(clientId, gymOrgId);
    grants.seedRequiredGrants(clientId, gymOrgId);

    const initial = await getGrants.execute(clientActor(), gymOrgId);
    expect(initial.profileAttributes).toEqual(expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT']));

    const updated = await updateGrants.execute(clientActor(), gymOrgId, {
      optionalProfileAttributes: ['MEDICAL_NOTES'],
      optionalClassGrants: ['CALORIES', 'WEARABLES'],
    });

    expect(updated.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'MEDICAL_NOTES']),
    );
    expect(updated.classGrants).toEqual(expect.arrayContaining(['CALORIES', 'WEARABLES']));
    expect(updated.profileAttributes).not.toContain('GENDER');
  });
});
