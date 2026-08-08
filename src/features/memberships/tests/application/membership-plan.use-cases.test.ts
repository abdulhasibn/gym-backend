import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { CreateMembershipPlanUseCase } from '../../application/create-membership-plan.use-case';
import { GetMembershipPlanUseCase } from '../../application/get-membership-plan.use-case';
import { ListMembershipPlansUseCase } from '../../application/list-membership-plans.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { PlanForbiddenError } from '../../application/plan-forbidden.error';
import { SoftDeleteMembershipPlanUseCase } from '../../application/soft-delete-membership-plan.use-case';
import { UpdateMembershipPlanUseCase } from '../../application/update-membership-plan.use-case';
import { DurationDays } from '../../domain/duration-days.value-object';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanName } from '../../domain/plan-name.value-object';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryMembershipPlanStore } from '../fakes/in-memory-membership-plan.repository';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminId = toUserId('11111111-1111-4111-8111-111111111111');

function adminActor(roleCode: AuthenticatedActor['roleCode'] = 'ADMIN'): AuthenticatedActor {
  return {
    userId: adminId,
    roleCode,
    lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
    email: 'admin@example.com',
    staffCode: 'STF-ADMIN',
  };
}

function setup() {
  const store = new InMemoryMembershipPlanStore();
  const admins = new FixedLiveGymAdmin();
  admins.seed(adminId, gymOrgId);
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-08T00:00:00.000Z'));
  let n = 0;
  const ids = {
    generate: () => {
      n += 1;
      return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
    },
  };

  return {
    store,
    create: new CreateMembershipPlanUseCase(store, policy, clock, ids),
    list: new ListMembershipPlansUseCase(store, policy),
    get: new GetMembershipPlanUseCase(store, policy),
    update: new UpdateMembershipPlanUseCase(store, policy, clock),
    softDelete: new SoftDeleteMembershipPlanUseCase(store, policy, clock),
  };
}

describe('membership plan use cases', () => {
  it('creates, lists, and gets BASE and ADDON plans for a live admin', async () => {
    const { create, list, get } = setup();

    const base = await create.execute(adminActor(), {
      gymOrgId,
      name: PlanName.create('Monthly'),
      kind: 'BASE',
      capability: null,
      durationDays: DurationDays.create(30),
      price: PlanPrice.create(999),
    });
    expect(base.kind).toBe('BASE');
    expect(base.active).toBe(true);

    const addon = await create.execute(adminActor(), {
      gymOrgId,
      name: PlanName.create('PT'),
      kind: 'ADDON',
      capability: 'TRAINER_COACHING',
      durationDays: DurationDays.create(30),
      price: PlanPrice.create(1500),
    });
    expect(addon.capability).toBe('TRAINER_COACHING');

    const listed = await list.execute(adminActor(), gymOrgId, { limit: 20, offset: 0 });
    expect(listed.total).toBe(2);

    const baseOnly = await list.execute(
      adminActor(),
      gymOrgId,
      { limit: 20, offset: 0 },
      {
        kind: 'BASE',
      },
    );
    expect(baseOnly.total).toBe(1);
    expect(baseOnly.items[0]?.name).toBe('Monthly');

    const one = await get.execute(adminActor(), gymOrgId, toMembershipPlanId(base.id));
    expect(one.price).toBe(999);
  });

  it('forbids non-admin and non-affiliated actors', async () => {
    const { create } = setup();
    await expect(
      create.execute(adminActor('TRAINER'), {
        gymOrgId,
        name: PlanName.create('X'),
        kind: 'BASE',
        capability: null,
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(1),
      }),
    ).rejects.toBeInstanceOf(PlanForbiddenError);

    const store = new InMemoryMembershipPlanStore();
    const policy = new PlanAdminPolicy(new FixedLiveGymAdmin());
    const createUnaffiliated = new CreateMembershipPlanUseCase(
      store,
      policy,
      new FixedClock(new Date('2026-08-08T00:00:00.000Z')),
      { generate: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' },
    );
    await expect(
      createUnaffiliated.execute(adminActor(), {
        gymOrgId,
        name: PlanName.create('X'),
        kind: 'BASE',
        capability: null,
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(1),
      }),
    ).rejects.toBeInstanceOf(PlanForbiddenError);
  });

  it('rejects invalid kind/capability combinations at create', async () => {
    const { create } = setup();
    await expect(
      create.execute(adminActor(), {
        gymOrgId,
        name: PlanName.create('Bad'),
        kind: 'BASE',
        capability: 'TRAINER_COACHING',
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(1),
      }),
    ).rejects.toThrow('BASE plans cannot have a capability');

    await expect(
      create.execute(adminActor(), {
        gymOrgId,
        name: PlanName.create('Bad Addon'),
        kind: 'ADDON',
        capability: null,
        durationDays: DurationDays.create(30),
        price: PlanPrice.create(1),
      }),
    ).rejects.toThrow('ADDON plans require a capability');
  });

  it('updates mutable fields and filters by active', async () => {
    const { create, update, list } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: PlanName.create('Monthly'),
      kind: 'BASE',
      capability: null,
      durationDays: DurationDays.create(30),
      price: PlanPrice.create(999),
    });

    const updated = await update.execute(adminActor(), {
      gymOrgId,
      planId: toMembershipPlanId(created.id),
      name: PlanName.create('Monthly Plus'),
      durationDays: DurationDays.create(45),
      price: PlanPrice.create(1200),
      active: false,
    });
    expect(updated.name).toBe('Monthly Plus');
    expect(updated.active).toBe(false);
    expect(updated.kind).toBe('BASE');

    const activeOnly = await list.execute(
      adminActor(),
      gymOrgId,
      { limit: 20, offset: 0 },
      {
        active: true,
      },
    );
    expect(activeOnly.total).toBe(0);

    const inactiveOnly = await list.execute(
      adminActor(),
      gymOrgId,
      { limit: 20, offset: 0 },
      {
        active: false,
      },
    );
    expect(inactiveOnly.total).toBe(1);
  });

  it('soft-deletes so get/list return not found', async () => {
    const { create, softDelete, get, list } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: PlanName.create('Monthly'),
      kind: 'BASE',
      capability: null,
      durationDays: DurationDays.create(30),
      price: PlanPrice.create(999),
    });

    await softDelete.execute(adminActor(), gymOrgId, toMembershipPlanId(created.id));

    await expect(
      get.execute(adminActor(), gymOrgId, toMembershipPlanId(created.id)),
    ).rejects.toBeInstanceOf(NotFoundError);

    const listed = await list.execute(adminActor(), gymOrgId, { limit: 20, offset: 0 });
    expect(listed.total).toBe(0);
  });
});
