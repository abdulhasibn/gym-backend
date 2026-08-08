import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { DurationDays } from '../../domain/duration-days.value-object';
import { MembershipPlanDeletedError } from '../../domain/membership-plan-deleted.error';
import { MembershipPlan } from '../../domain/membership-plan.entity';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanName } from '../../domain/plan-name.value-object';
import { PlanPrice } from '../../domain/plan-price.value-object';

const now = new Date('2026-08-08T00:00:00.000Z');

function createBasePlan(): MembershipPlan {
  return MembershipPlan.create({
    id: toMembershipPlanId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    name: PlanName.create('Monthly'),
    kind: 'BASE',
    capability: null,
    durationDays: DurationDays.create(30),
    price: PlanPrice.create(999),
    now,
  });
}

describe('MembershipPlan domain', () => {
  it('creates BASE plans as active without capability', () => {
    const plan = createBasePlan();
    expect(plan.kind).toBe('BASE');
    expect(plan.capability).toBeNull();
    expect(plan.active).toBe(true);
  });

  it('creates ADDON plans with TRAINER_COACHING', () => {
    const plan = MembershipPlan.create({
      id: toMembershipPlanId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab'),
      gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
      name: PlanName.create('PT Addon'),
      kind: 'ADDON',
      capability: 'TRAINER_COACHING',
      durationDays: DurationDays.create(30),
      price: PlanPrice.create(1500),
      now,
    });
    expect(plan.capability).toBe('TRAINER_COACHING');
  });

  it('rejects BASE with capability and ADDON without', () => {
    expect(() =>
      MembershipPlan.create({
        id: toMembershipPlanId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac'),
        gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
        name: PlanName.create('Bad'),
        kind: 'BASE',
        capability: 'TRAINER_COACHING',
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(1),
        now,
      }),
    ).toThrow('BASE plans cannot have a capability');

    expect(() =>
      MembershipPlan.create({
        id: toMembershipPlanId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad'),
        gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
        name: PlanName.create('Bad Addon'),
        kind: 'ADDON',
        capability: null,
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(1),
        now,
      }),
    ).toThrow('ADDON plans require a capability');
  });

  it('rejects invalid VO inputs', () => {
    expect(() => PlanName.create('')).toThrow('Plan name cannot be empty');
    expect(() => DurationDays.create(0)).toThrow('Duration days must be at least 1');
    expect(() => PlanPrice.create(-1)).toThrow('Plan price cannot be negative');
    expect(() => PlanPrice.create(1.001)).toThrow('Plan price must have at most 2 decimal places');
  });

  it('updates mutable fields without changing kind or capability', () => {
    const plan = createBasePlan();
    plan.updateProfile(
      {
        name: PlanName.create('Quarterly'),
        durationDays: DurationDays.create(90),
        price: PlanPrice.create(2499.5),
        active: false,
      },
      new Date('2026-08-08T01:00:00.000Z'),
    );
    expect(plan.name.value).toBe('Quarterly');
    expect(plan.durationDays.value).toBe(90);
    expect(plan.price.value).toBe(2499.5);
    expect(plan.active).toBe(false);
    expect(plan.kind).toBe('BASE');
    expect(plan.capability).toBeNull();
  });

  it('soft-deletes once and blocks further mutation', () => {
    const plan = createBasePlan();
    plan.softDelete(now);
    expect(plan.isDeleted).toBe(true);
    expect(() =>
      plan.updateProfile(
        {
          name: PlanName.create('X'),
          durationDays: DurationDays.create(1),
          price: PlanPrice.create(0),
          active: true,
        },
        now,
      ),
    ).toThrow(MembershipPlanDeletedError);
  });
});
