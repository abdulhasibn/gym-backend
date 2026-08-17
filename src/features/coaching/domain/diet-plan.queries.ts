import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { UserId } from '../../../domain/shared/user-id';
import type { DietPlanId } from './diet-plan-id';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';

export interface DietPlanItemSummary {
  readonly id: DietPlanMealItemId;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
}

export interface DietPlanMealSummary {
  readonly id: string;
  readonly mealSlot: MealSlot;
  readonly sortOrder: number;
  readonly items: readonly DietPlanItemSummary[];
}

export interface DietPlanSummary {
  readonly id: DietPlanId;
  readonly clientUserId: UserId;
  readonly trainerId: string;
  readonly gymOrgId: GymOrgId;
  readonly title: string;
  readonly notes: string | null;
  readonly status: string;
  readonly meals: readonly DietPlanMealSummary[];
  readonly clonedFromTemplateId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DietPlanQueries {
  findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<DietPlanSummary | null>;
}
