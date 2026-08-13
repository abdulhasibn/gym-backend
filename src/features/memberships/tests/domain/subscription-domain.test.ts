import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { DurationDays } from '../../domain/duration-days.value-object';
import { InvalidSubscriptionPaymentError } from '../../domain/invalid-subscription-payment.error';
import { InvalidSubscriptionStartError } from '../../domain/invalid-subscription-start.error';
import { toMembershipId } from '../../domain/membership-id';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { Subscription } from '../../domain/subscription.entity';
import { toSubscriptionId } from '../../domain/subscription-id';

const now = new Date('2026-08-09T00:00:00.000Z');

function unstartedBase(overrides?: { price?: number; durationDays?: number }): Subscription {
  const price = PlanPrice.create(overrides?.price ?? 1000);
  return Subscription.reconstitute({
    id: toSubscriptionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    clientMembershipId: toMembershipId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    gymOrgId: toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    planId: toMembershipPlanId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
    kind: 'BASE',
    capability: null,
    priceAmount: price,
    durationDays: DurationDays.create(overrides?.durationDays ?? 30),
    startDate: null,
    endDate: null,
    startSource: null,
    paymentStatus: 'unpaid',
    amountPaid: PlanPrice.create(0),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe('CalendarDate', () => {
  it('adds days without wall-clock shift', () => {
    expect(CalendarDate.create('2026-01-31').addDays(1).value).toBe('2026-02-01');
    expect(CalendarDate.create('2026-08-01').addDays(29).value).toBe('2026-08-30');
  });

  it('rejects invalid calendar days', () => {
    expect(() => CalendarDate.create('2026-02-30')).toThrow();
    expect(() => CalendarDate.create('08/01/2026')).toThrow();
  });
});

describe('Subscription domain', () => {
  it('derives amount for paid and unpaid payment updates', () => {
    const subscription = unstartedBase({ price: 999 });
    subscription.setPayment('paid', null, now);
    expect(subscription.paymentStatus).toBe('paid');
    expect(subscription.amountPaid.value).toBe(999);

    subscription.setPayment('unpaid', PlanPrice.create(50), now);
    expect(subscription.paymentStatus).toBe('unpaid');
    expect(subscription.amountPaid.value).toBe(0);
  });

  it('requires amountPaid for partial and enforces range', () => {
    const subscription = unstartedBase({ price: 1000 });
    expect(() => subscription.setPayment('partial', null, now)).toThrow(
      InvalidSubscriptionPaymentError,
    );
    expect(() => subscription.setPayment('partial', PlanPrice.create(0), now)).toThrow(
      InvalidSubscriptionPaymentError,
    );
    expect(() => subscription.setPayment('partial', PlanPrice.create(1000), now)).toThrow(
      InvalidSubscriptionPaymentError,
    );

    subscription.setPayment('partial', PlanPrice.create(250.5), now);
    expect(subscription.amountPaid.value).toBe(250.5);
  });

  it('overrides start on unstarted BASE and computes end from duration', () => {
    const subscription = unstartedBase({ durationDays: 30 });
    subscription.overrideStart(CalendarDate.create('2026-08-01'), now);
    expect(subscription.startDate?.value).toBe('2026-08-01');
    expect(subscription.endDate?.value).toBe('2026-08-30');
    expect(subscription.startSource).toBe('ADMIN_OVERRIDE');
  });

  it('starts unstarted BASE from first attendance', () => {
    const subscription = unstartedBase({ durationDays: 30 });
    subscription.startFromFirstAttendance(CalendarDate.create('2026-08-01'), now);
    expect(subscription.startDate?.value).toBe('2026-08-01');
    expect(subscription.endDate?.value).toBe('2026-08-30');
    expect(subscription.startSource).toBe('FIRST_ATTENDANCE');
  });

  it('rejects start override on ADDON or already-started BASE', () => {
    const addon = Subscription.reconstitute({
      id: toSubscriptionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab'),
      clientMembershipId: toMembershipId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
      gymOrgId: toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
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
    expect(() => addon.overrideStart(CalendarDate.create('2026-09-01'), now)).toThrow(
      InvalidSubscriptionStartError,
    );

    const started = unstartedBase();
    started.overrideStart(CalendarDate.create('2026-08-01'), now);
    expect(() => started.overrideStart(CalendarDate.create('2026-09-01'), now)).toThrow(
      InvalidSubscriptionStartError,
    );
  });
});
