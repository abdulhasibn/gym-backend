import type { DietPlanSummary } from '../domain/diet-plan.queries';
import type { DietPlan } from '../domain/diet-plan.entity';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';

export interface DietPlanItemDto {
  readonly id: string;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
  readonly mealSlot: MealSlot;
  readonly logged?: boolean;
}

export interface DietPlanMealDto {
  readonly id: string;
  readonly mealSlot: MealSlot;
  readonly items: readonly DietPlanItemDto[];
}

export interface DietPlanDto {
  readonly id: string;
  readonly clientUserId: string;
  readonly trainerId: string;
  readonly gymOrgId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly status: string;
  readonly writable: boolean;
  readonly logDate: string | null;
  readonly meals: readonly DietPlanMealDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toDietPlanDtoFromEntity(
  plan: DietPlan,
  extras: { writable: boolean; logDate: string | null; loggedItemIds?: ReadonlySet<string> },
): DietPlanDto {
  return {
    id: plan.id,
    clientUserId: plan.clientUserId,
    trainerId: plan.trainerId,
    gymOrgId: plan.gymOrgId,
    title: plan.title.value,
    notes: plan.notes,
    status: plan.status,
    writable: extras.writable,
    logDate: extras.logDate,
    meals: plan.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
        mealSlot: meal.mealSlot,
        logged: extras.loggedItemIds === undefined ? undefined : extras.loggedItemIds.has(item.id),
      })),
    })),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toDietPlanDtoFromSummary(
  summary: DietPlanSummary,
  extras: {
    writable: boolean;
    logDate: string | null;
    loggedItemIds?: ReadonlySet<DietPlanMealItemId>;
  },
): DietPlanDto {
  return {
    id: summary.id,
    clientUserId: summary.clientUserId,
    trainerId: summary.trainerId,
    gymOrgId: summary.gymOrgId,
    title: summary.title,
    notes: summary.notes,
    status: summary.status,
    writable: extras.writable,
    logDate: extras.logDate,
    meals: summary.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity,
        mealSlot: meal.mealSlot,
        logged: extras.loggedItemIds === undefined ? undefined : extras.loggedItemIds.has(item.id),
      })),
    })),
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
