import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { ListClientSubscriptionsUseCase } from '../../application/list-client-subscriptions.use-case';
import { ListMySubscriptionsUseCase } from '../../application/list-my-subscriptions.use-case';
import { OverrideSubscriptionStartUseCase } from '../../application/override-subscription-start.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { PlanForbiddenError } from '../../application/plan-forbidden.error';
import { SubscriptionForbiddenError } from '../../application/subscription-forbidden.error';
import { UpdateSubscriptionPaymentUseCase } from '../../application/update-subscription-payment.use-case';
import { CalendarDate } from '../../domain/calendar-date.value-object';
import { DurationDays } from '../../domain/duration-days.value-object';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { Subscription } from '../../domain/subscription.entity';
import { toSubscriptionId } from '../../domain/subscription-id';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryClientMembershipStore } from '../fakes/in-memory-client-membership.repository';
import { InMemorySubscriptionStore } from '../fakes/in-memory-subscription.repository';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminId = toUserId('11111111-1111-4111-8111-111111111111');
const clientId = toUserId('22222222-2222-4222-8222-222222222222');
const now = new Date('2026-08-09T00:00:00.000Z');

function adminActor(): AuthenticatedActor {
  return {
    userId: adminId,
    roleCode: 'ADMIN',
    lane: 'STAFF',
    email: 'admin@example.com',
    staffCode: 'STF-ADMIN',
  };
}

function clientActor(): AuthenticatedActor {
  return {
    userId: clientId,
    roleCode: 'CLIENT',
    lane: 'CLIENT',
    email: 'client@example.com',
    staffCode: null,
  };
}

function setup() {
  const memberships = new InMemoryClientMembershipStore();
  const subscriptions = new InMemorySubscriptionStore();
  const admins = new FixedLiveGymAdmin();
  admins.seed(adminId, gymOrgId);
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(now);

  const membership = memberships.seedActive(clientId, gymOrgId);
  const base = Subscription.reconstitute({
    id: toSubscriptionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    clientMembershipId: membership.id,
    gymOrgId,
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
  subscriptions.seed(base, clientId);

  return {
    memberships,
    subscriptions,
    updatePayment: new UpdateSubscriptionPaymentUseCase(policy, subscriptions, memberships, clock),
    overrideStart: new OverrideSubscriptionStartUseCase(policy, subscriptions, memberships, clock),
    listClient: new ListClientSubscriptionsUseCase(policy, subscriptions),
    listMine: new ListMySubscriptionsUseCase(subscriptions),
    baseId: base.id,
  };
}

describe('UpdateSubscriptionPaymentUseCase', () => {
  it('updates payment for a live admin', async () => {
    const { updatePayment, baseId } = setup();
    const result = await updatePayment.execute(adminActor(), {
      gymOrgId,
      subscriptionId: baseId,
      paymentStatus: 'paid',
      amountPaid: null,
    });
    expect(result.paymentStatus).toBe('paid');
    expect(result.amountPaid).toBe(1000);
  });

  it('rejects non-admin actors', async () => {
    const { updatePayment, baseId } = setup();
    await expect(
      updatePayment.execute(clientActor(), {
        gymOrgId,
        subscriptionId: baseId,
        paymentStatus: 'paid',
        amountPaid: null,
      }),
    ).rejects.toBeInstanceOf(PlanForbiddenError);
  });
});

describe('OverrideSubscriptionStartUseCase', () => {
  it('sets BASE start and end for a live admin', async () => {
    const { overrideStart, baseId } = setup();
    const result = await overrideStart.execute(adminActor(), {
      gymOrgId,
      subscriptionId: baseId,
      startDate: CalendarDate.create('2026-08-01'),
    });
    expect(result.startDate).toBe('2026-08-01');
    expect(result.endDate).toBe('2026-08-30');
    expect(result.startSource).toBe('ADMIN_OVERRIDE');
  });

  it('returns not found for unknown subscription', async () => {
    const { overrideStart } = setup();
    await expect(
      overrideStart.execute(adminActor(), {
        gymOrgId,
        subscriptionId: toSubscriptionId('ffffffff-ffff-4fff-8fff-ffffffffffff'),
        startDate: CalendarDate.create('2026-08-01'),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('list subscription use cases', () => {
  it('lists client subscriptions for admin and self for client', async () => {
    const { listClient, listMine } = setup();

    const forAdmin = await listClient.execute(adminActor(), gymOrgId, clientId);
    expect(forAdmin).toHaveLength(1);
    expect(forAdmin[0]?.kind).toBe('BASE');

    const forClient = await listMine.execute(clientActor(), gymOrgId);
    expect(forClient).toHaveLength(1);
  });

  it('forbids staff from my-subscriptions and 404s missing membership', async () => {
    const { listMine, listClient } = setup();
    await expect(listMine.execute(adminActor(), gymOrgId)).rejects.toBeInstanceOf(
      SubscriptionForbiddenError,
    );
    await expect(
      listClient.execute(adminActor(), gymOrgId, toUserId('33333333-3333-4333-8333-333333333333')),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
