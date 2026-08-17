import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toFoodItemId } from '../../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../../domain/shared/food-serving-id';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { ClientSelfPolicy } from '../../application/client-self.policy';
import { GetStaffClientCalorieLogUseCase } from '../../application/get-staff-client-calorie-log.use-case';
import { LogExtraFoodUseCase } from '../../application/log-extra-food.use-case';
import { NutritionForbiddenError } from '../../application/nutrition-forbidden.error';
import { StaffCalorieReadPolicy } from '../../application/staff-calorie-read.policy';
import type { CalorieLogEntry } from '../../domain/calorie-log-entry.entity';
import type { CalorieLogItemId } from '../../domain/calorie-log-item-id';
import type { CalorieLogQueries, CalorieLogDaySummary } from '../../domain/calorie-log.queries';
import type { CalorieLogRepository } from '../../domain/calorie-log.repository';
import type { FoodCatalogRepository, SeedFoodServing } from '../../domain/food-catalog.repository';

const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const staffId = toUserId('22222222-2222-4222-8222-222222222222');
const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const foodId = 'f00d0000-0000-4000-8000-000000000001';
const servingId = 'f00d5e04-0000-4000-8000-000000010003';

const client: AuthenticatedActor = {
  userId: clientId,
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

const trainer: AuthenticatedActor = {
  userId: staffId,
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

class InMemoryLogs implements CalorieLogRepository {
  entry: CalorieLogEntry | null = null;

  async findByClientAndDate(): Promise<CalorieLogEntry | null> {
    return this.entry;
  }

  async findByClientAndItem(
    _c: typeof clientId,
    itemId: CalorieLogItemId,
  ): Promise<CalorieLogEntry | null> {
    if (this.entry === null) {
      return null;
    }
    return this.entry.liveItems.some((item) => item.id === itemId) ? this.entry : null;
  }

  async save(entry: CalorieLogEntry): Promise<void> {
    this.entry = entry;
  }
}

class SeedCatalog implements FoodCatalogRepository {
  async findLiveSeedServing(): Promise<SeedFoodServing | null> {
    return {
      foodItemId: toFoodItemId(foodId),
      servingId: toFoodServingId(servingId),
      grams: 30,
      per100g: { calories: 135, proteinG: 4, carbsG: 27, fatG: 0.5 },
    };
  }
}

describe('LogExtraFoodUseCase', () => {
  it('snapshots scaled macros onto the diary', async () => {
    const logs = new InMemoryLogs();
    const useCase = new LogExtraFoodUseCase(
      new ClientSelfPolicy(),
      new SeedCatalog(),
      logs,
      { now: () => new Date('2026-08-17T04:00:00.000Z') },
      { generate: () => crypto.randomUUID() },
      () => CalendarDate.create('2026-08-17'),
    );

    const result = await useCase.execute(client, {
      foodItemId: foodId,
      servingId,
      quantity: 2,
      mealSlot: 'BREAKFAST',
      logDate: undefined,
    });

    expect(result.totalCalories).toBe(81);
    expect(result.slots.find((slot) => slot.mealSlot === 'BREAKFAST')?.items).toHaveLength(1);
  });
});

describe('GetStaffClientCalorieLogUseCase', () => {
  it('requires the CALORIES grant', async () => {
    const queries: CalorieLogQueries = {
      async findDay(): Promise<CalorieLogDaySummary | null> {
        return null;
      },
      async findLoggedPrescribedItemIds() {
        return [];
      },
    };
    const useCase = new GetStaffClientCalorieLogUseCase(
      new StaffCalorieReadPolicy(
        { isLiveAdmin: async () => false },
        { isLiveTrainer: async () => true },
      ),
      queries,
      { loadForActiveMembership: async () => ({ classGrants: ['PROGRESS'] }) },
      { now: () => new Date('2026-08-17T04:00:00.000Z') },
      () => CalendarDate.create('2026-08-17'),
    );

    await expect(useCase.execute(trainer, gymOrgId, clientId, undefined)).rejects.toBeInstanceOf(
      NutritionForbiddenError,
    );
  });
});
