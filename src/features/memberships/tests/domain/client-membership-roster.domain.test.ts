import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { ClientMembership } from '../../domain/client-membership.entity';
import { ClientMembershipInvalidTransitionError } from '../../domain/client-membership-invalid-transition.error';
import { toMembershipId } from '../../domain/membership-id';
import { toMembershipInviteId } from '../../domain/membership-invite-id';
import { CalendarDate } from '../../domain/calendar-date.value-object';
import { DurationDays } from '../../domain/duration-days.value-object';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { Subscription } from '../../domain/subscription.entity';
import { toSubscriptionId } from '../../domain/subscription-id';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';

const now = new Date('2026-08-09T00:00:00.000Z');

function activeMembership(): ClientMembership {
  return ClientMembership.create({
    id: toMembershipId('eeeeeeee-eeee-4eee-8eee-000000000001'),
    clientUserId: toUserId('22222222-2222-4222-8222-222222222222'),
    gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    sourceInviteId: toMembershipInviteId('dddddddd-dddd-4ddd-8ddd-000000000001'),
    now,
  });
}

describe('ClientMembership roster transitions', () => {
  it('offboards ACTIVE membership and sets leftAt', () => {
    const membership = activeMembership();
    membership.offboard(now);
    expect(membership.status).toBe('INACTIVE');
    expect(membership.leftAt).toEqual(now);
    expect(membership.isActive).toBe(false);
  });

  it('rejects offboard when already inactive', () => {
    const membership = activeMembership();
    membership.offboard(now);
    expect(() => membership.offboard(now)).toThrow(ClientMembershipInvalidTransitionError);
  });

  it('assigns trainer while ACTIVE', () => {
    const membership = activeMembership();
    const trainerId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    membership.assignTrainer(trainerId, now);
    expect(membership.assignedTrainerId).toBe(trainerId);
  });

  it('block and unblock check-in are idempotent', () => {
    const membership = activeMembership();
    membership.blockCheckIn(now);
    membership.blockCheckIn(now);
    expect(membership.checkInBlocked).toBe(true);
    membership.unblockCheckIn(now);
    membership.unblockCheckIn(now);
    expect(membership.checkInBlocked).toBe(false);
  });
});

describe('Subscription.isInDate', () => {
  it('returns true when today is inside start/end inclusive', () => {
    const subscription = Subscription.reconstitute({
      id: toSubscriptionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientMembershipId: toMembershipId('eeeeeeee-eeee-4eee-8eee-000000000001'),
      gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
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
    });

    expect(subscription.isInDate(CalendarDate.create('2026-08-01'))).toBe(true);
    expect(subscription.isInDate(CalendarDate.create('2026-08-30'))).toBe(true);
    expect(subscription.isInDate(CalendarDate.create('2026-08-31'))).toBe(false);
  });

  it('returns false when unstarted', () => {
    const subscription = Subscription.reconstitute({
      id: toSubscriptionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientMembershipId: toMembershipId('eeeeeeee-eeee-4eee-8eee-000000000001'),
      gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
      planId: toMembershipPlanId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      kind: 'BASE',
      capability: null,
      priceAmount: PlanPrice.create(1000),
      durationDays: DurationDays.create(30),
      startDate: null,
      endDate: null,
      startSource: null,
      paymentStatus: 'unpaid',
      amountPaid: PlanPrice.create(0),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(subscription.isInDate(CalendarDate.create('2026-08-09'))).toBe(false);
  });
});
