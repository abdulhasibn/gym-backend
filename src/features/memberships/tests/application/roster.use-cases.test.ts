import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { AssignTrainerUseCase } from '../../application/assign-trainer.use-case';
import { CoachingAddonRequiredError } from '../../application/coaching-addon-required.error';
import { ListGymMembersUseCase } from '../../application/list-gym-members.use-case';
import { ListMyAssignedMembersUseCase } from '../../application/list-my-assigned-members.use-case';
import { OffboardClientUseCase } from '../../application/offboard-client.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { PlanForbiddenError } from '../../application/plan-forbidden.error';
import { RosterForbiddenError } from '../../application/roster-forbidden.error';
import { SetCheckInBlockedUseCase } from '../../application/set-check-in-blocked.use-case';
import { TrainerRosterPolicy } from '../../application/trainer-roster.policy';
import { CalendarDate } from '../../domain/calendar-date.value-object';
import { DurationDays } from '../../domain/duration-days.value-object';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { Subscription } from '../../domain/subscription.entity';
import { toSubscriptionId } from '../../domain/subscription-id';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { FixedLiveTrainerProfile } from '../fakes/fixed-live-trainer-profile';
import { InMemoryClientMembershipStore } from '../fakes/in-memory-client-membership.repository';
import { InMemoryOffboardMembership } from '../fakes/in-memory-offboard-membership';
import { InMemorySubscriptionStore } from '../fakes/in-memory-subscription.repository';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminUserId = toUserId('11111111-1111-4111-8111-111111111111');
const trainerUserId = toUserId('33333333-3333-4333-8333-333333333333');
const clientUserId = toUserId('22222222-2222-4222-8222-222222222222');
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const now = new Date('2026-08-09T00:00:00.000Z');

function adminActor(): AuthenticatedActor {
  return {
    userId: adminUserId,
    roleCode: 'ADMIN',
    lane: 'STAFF',
    email: 'admin@example.com',
    staffCode: 'STF-ADMIN',
  };
}

function trainerActor(): AuthenticatedActor {
  return {
    userId: trainerUserId,
    roleCode: 'TRAINER',
    lane: 'STAFF',
    email: 'trainer@example.com',
    staffCode: 'STF-TRAIN',
  };
}

function seedCoachingAddon(
  subscriptions: InMemorySubscriptionStore,
  membershipId: ReturnType<InMemoryClientMembershipStore['seedActive']>['id'],
): void {
  subscriptions.seed(
    Subscription.reconstitute({
      id: toSubscriptionId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      clientMembershipId: membershipId,
      gymOrgId,
      planId: toMembershipPlanId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      kind: 'ADDON',
      capability: 'TRAINER_COACHING',
      priceAmount: PlanPrice.create(500),
      durationDays: DurationDays.create(30),
      startDate: CalendarDate.create('2026-08-01'),
      endDate: CalendarDate.create('2026-08-30'),
      startSource: 'ADMIN_ATTACH',
      paymentStatus: 'unpaid',
      amountPaid: PlanPrice.create(0),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

describe('ListGymMembersUseCase', () => {
  it('rejects non-admin', async () => {
    const admins = new FixedLiveGymAdmin();
    const memberships = new InMemoryClientMembershipStore();
    const useCase = new ListGymMembersUseCase(new PlanAdminPolicy(admins), memberships);

    await expect(
      useCase.execute(trainerActor(), { gymOrgId, status: 'ACTIVE', q: null }),
    ).rejects.toBeInstanceOf(PlanForbiddenError);
  });

  it('lists ACTIVE members for admin', async () => {
    const admins = new FixedLiveGymAdmin();
    admins.seed(adminUserId, gymOrgId);
    const memberships = new InMemoryClientMembershipStore();
    memberships.seedActive(clientUserId, gymOrgId);
    const useCase = new ListGymMembersUseCase(new PlanAdminPolicy(admins), memberships);

    const rows = await useCase.execute(adminActor(), {
      gymOrgId,
      status: 'ACTIVE',
      q: null,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.clientUserId).toBe(clientUserId);
  });
});

describe('ListMyAssignedMembersUseCase', () => {
  it('rejects staff without trainer profile', async () => {
    const trainers = new FixedLiveTrainerProfile();
    const memberships = new InMemoryClientMembershipStore();
    const useCase = new ListMyAssignedMembersUseCase(
      new TrainerRosterPolicy(trainers),
      memberships,
    );

    await expect(
      useCase.execute(trainerActor(), { gymOrgId, status: null, q: null }),
    ).rejects.toBeInstanceOf(RosterForbiddenError);
  });

  it('returns only assigned members', async () => {
    const trainers = new FixedLiveTrainerProfile();
    trainers.seed(trainerUserId, gymOrgId, trainerProfileId);
    const memberships = new InMemoryClientMembershipStore();
    const clock = new FixedClock(now);
    const assigned = memberships.seedActive(clientUserId, gymOrgId);
    assigned.assignTrainer(trainerProfileId, clock.now());
    await memberships.save(assigned);
    memberships.seedActive(toUserId('44444444-4444-4444-8444-444444444444'), gymOrgId);

    const useCase = new ListMyAssignedMembersUseCase(
      new TrainerRosterPolicy(trainers),
      memberships,
    );
    const rows = await useCase.execute(trainerActor(), {
      gymOrgId,
      status: 'ACTIVE',
      q: null,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.assignedTrainerId).toBe(trainerProfileId);
  });
});

describe('AssignTrainerUseCase', () => {
  it('requires in-date coaching addon', async () => {
    const admins = new FixedLiveGymAdmin();
    admins.seed(adminUserId, gymOrgId);
    const memberships = new InMemoryClientMembershipStore();
    const subscriptions = new InMemorySubscriptionStore();
    const trainers = new FixedLiveTrainerProfile();
    trainers.seed(trainerUserId, gymOrgId, trainerProfileId);
    const membership = memberships.seedActive(clientUserId, gymOrgId);

    const useCase = new AssignTrainerUseCase(
      new PlanAdminPolicy(admins),
      memberships,
      subscriptions,
      trainers,
      new FixedClock(now),
    );

    await expect(
      useCase.execute(adminActor(), {
        gymOrgId,
        membershipId: membership.id,
        trainerProfileId,
      }),
    ).rejects.toBeInstanceOf(CoachingAddonRequiredError);
  });

  it('assigns trainer when coaching addon is in date', async () => {
    const admins = new FixedLiveGymAdmin();
    admins.seed(adminUserId, gymOrgId);
    const memberships = new InMemoryClientMembershipStore();
    const subscriptions = new InMemorySubscriptionStore();
    const trainers = new FixedLiveTrainerProfile();
    trainers.seed(trainerUserId, gymOrgId, trainerProfileId);
    const membership = memberships.seedActive(clientUserId, gymOrgId);
    seedCoachingAddon(subscriptions, membership.id);

    const useCase = new AssignTrainerUseCase(
      new PlanAdminPolicy(admins),
      memberships,
      subscriptions,
      trainers,
      new FixedClock(now),
    );

    const result = await useCase.execute(adminActor(), {
      gymOrgId,
      membershipId: membership.id,
      trainerProfileId,
    });

    expect(result.assignedTrainerId).toBe(trainerProfileId);
  });

  it('rejects unknown trainer at gym', async () => {
    const admins = new FixedLiveGymAdmin();
    admins.seed(adminUserId, gymOrgId);
    const memberships = new InMemoryClientMembershipStore();
    const subscriptions = new InMemorySubscriptionStore();
    const trainers = new FixedLiveTrainerProfile();
    const membership = memberships.seedActive(clientUserId, gymOrgId);
    seedCoachingAddon(subscriptions, membership.id);

    const useCase = new AssignTrainerUseCase(
      new PlanAdminPolicy(admins),
      memberships,
      subscriptions,
      trainers,
      new FixedClock(now),
    );

    await expect(
      useCase.execute(adminActor(), {
        gymOrgId,
        membershipId: membership.id,
        trainerProfileId,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('OffboardClientUseCase', () => {
  it('offboards and clears grants via port', async () => {
    const admins = new FixedLiveGymAdmin();
    admins.seed(adminUserId, gymOrgId);
    const memberships = new InMemoryClientMembershipStore();
    const offboard = new InMemoryOffboardMembership(memberships);
    const membership = memberships.seedActive(clientUserId, gymOrgId);

    const useCase = new OffboardClientUseCase(
      new PlanAdminPolicy(admins),
      memberships,
      offboard,
      new FixedClock(now),
    );

    const result = await useCase.execute(adminActor(), {
      gymOrgId,
      membershipId: membership.id,
    });

    expect(result.status).toBe('INACTIVE');
    expect(offboard.clearedGrantKeys).toEqual([`${clientUserId}:${gymOrgId}`]);
  });
});

describe('SetCheckInBlockedUseCase', () => {
  it('blocks and unblocks check-in', async () => {
    const admins = new FixedLiveGymAdmin();
    admins.seed(adminUserId, gymOrgId);
    const memberships = new InMemoryClientMembershipStore();
    const membership = memberships.seedActive(clientUserId, gymOrgId);
    const useCase = new SetCheckInBlockedUseCase(
      new PlanAdminPolicy(admins),
      memberships,
      new FixedClock(now),
    );

    const blocked = await useCase.execute(adminActor(), {
      gymOrgId,
      membershipId: membership.id,
      blocked: true,
    });
    expect(blocked.checkInBlocked).toBe(true);

    const unblocked = await useCase.execute(adminActor(), {
      gymOrgId,
      membershipId: membership.id,
      blocked: false,
    });
    expect(unblocked.checkInBlocked).toBe(false);
  });
});
