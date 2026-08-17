import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toFoodItemId } from '../../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../../domain/shared/food-serving-id';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { AssignDietPlanUseCase } from '../../application/assign-diet-plan.use-case';
import { CoachingAddonRequiredError } from '../../application/coaching-addon-required.error';
import { CompleteDietItemUseCase } from '../../application/complete-diet-item.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DietClientPolicy } from '../../application/diet-client.policy';
import type { CoachingEntitlementPort } from '../../domain/coaching-entitlement.port';
import type { DietPlan } from '../../domain/diet-plan.entity';
import type { DietPlanRepository } from '../../domain/diet-plan.repository';
import type { GymLocalClock } from '../../domain/gym-local-clock.port';
import type { LogPrescribedFood } from '../../domain/log-prescribed-food.port';
import type { SeedCatalogPort } from '../../domain/seed-catalog.port';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const trainerUserId = toUserId('22222222-2222-4222-8222-222222222222');
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const foodId = 'f00d0000-0000-4000-8000-000000000001';
const servingId = 'f00d5e04-0000-4000-8000-000000010003';

const trainer: AuthenticatedActor = {
  userId: trainerUserId,
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

const client: AuthenticatedActor = {
  userId: clientId,
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

class MemoryPlans implements DietPlanRepository {
  last: DietPlan | null = null;

  async findActiveByClientAtGym(): Promise<DietPlan | null> {
    return this.last;
  }

  async assign(plan: DietPlan): Promise<void> {
    if (this.last !== null) {
      this.last.archive(plan.updatedAt);
    }
    this.last = plan;
  }
}

const entitlement: CoachingEntitlementPort = {
  async findActiveMembership() {
    return { assignedTrainerId: trainerProfileId };
  },
  async hasInDateCoachingAddon() {
    return true;
  },
};

const frozenEntitlement: CoachingEntitlementPort = {
  async findActiveMembership() {
    return { assignedTrainerId: trainerProfileId };
  },
  async hasInDateCoachingAddon() {
    return false;
  },
};

const catalog: SeedCatalogPort = {
  async hasLiveSeedServing(foodItemId, servingIdToFind) {
    return foodItemId === toFoodItemId(foodId) && servingIdToFind === toFoodServingId(servingId);
  },
};

const gymClock: GymLocalClock = {
  async today() {
    return CalendarDate.create('2026-08-17');
  },
};

const policy = new DietAssignPolicy(
  { isLiveAdmin: async () => false },
  { findLiveProfileId: async () => trainerProfileId },
);

describe('AssignDietPlanUseCase', () => {
  it('archives the previous active plan conceptually by assigning a new one', async () => {
    const plans = new MemoryPlans();
    const useCase = new AssignDietPlanUseCase(
      policy,
      entitlement,
      catalog,
      plans,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
      { generate: () => crypto.randomUUID() },
    );

    const created = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      title: 'Cut week',
      notes: null,
      meals: [
        {
          mealSlot: 'BREAKFAST',
          items: [{ foodItemId: foodId, servingId, quantity: 2 }],
        },
      ],
    });

    expect(created.title).toBe('Cut week');
    expect(created.meals[0]?.items).toHaveLength(1);
    expect(plans.last?.isActive).toBe(true);
  });

  it('freezes assign when the coaching addon is expired', async () => {
    const useCase = new AssignDietPlanUseCase(
      policy,
      frozenEntitlement,
      catalog,
      new MemoryPlans(),
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
      { generate: () => crypto.randomUUID() },
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        title: 'Cut week',
        notes: null,
        meals: [
          {
            mealSlot: 'BREAKFAST',
            items: [{ foodItemId: foodId, servingId, quantity: 2 }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CoachingAddonRequiredError);
  });
});

describe('CompleteDietItemUseCase', () => {
  it('freezes complete when the coaching addon is expired', async () => {
    const logPrescribed: LogPrescribedFood = {
      async log() {},
      async unlog() {},
    };
    const useCase = new CompleteDietItemUseCase(
      new DietClientPolicy(),
      frozenEntitlement,
      new MemoryPlans(),
      logPrescribed,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
    );

    await expect(useCase.execute(client, gymOrgId, crypto.randomUUID())).rejects.toBeInstanceOf(
      CoachingAddonRequiredError,
    );
  });
});
