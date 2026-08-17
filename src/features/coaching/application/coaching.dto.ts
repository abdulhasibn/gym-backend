import type { DietPlanSummary } from '../domain/diet-plan.queries';
import type { DietPlan } from '../domain/diet-plan.entity';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { DietPlanTemplate } from '../domain/diet-plan-template.entity';
import type { DietPlanTemplateSummary } from '../domain/diet-plan-template.queries';

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
  readonly clonedFromTemplateId: string | null;
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
    clonedFromTemplateId: plan.clonedFromTemplateId,
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
    clonedFromTemplateId: summary.clonedFromTemplateId,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export interface DietPlanTemplateItemDto {
  readonly id: string;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
}

export interface DietPlanTemplateMealDto {
  readonly id: string;
  readonly mealSlot: MealSlot;
  readonly items: readonly DietPlanTemplateItemDto[];
}

export interface DietPlanTemplateDto {
  readonly id: string;
  readonly gymOrgId: string;
  readonly trainerId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly clonedFromId: string | null;
  readonly meals: readonly DietPlanTemplateMealDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toDietPlanTemplateDto(template: DietPlanTemplate): DietPlanTemplateDto {
  return {
    id: template.id,
    gymOrgId: template.gymOrgId,
    trainerId: template.trainerId,
    title: template.title.value,
    notes: template.notes,
    clonedFromId: template.clonedFromId,
    meals: template.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
      })),
    })),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function toDietPlanTemplateDtoFromSummary(
  summary: DietPlanTemplateSummary,
): DietPlanTemplateDto {
  return {
    id: summary.id,
    gymOrgId: summary.gymOrgId,
    trainerId: summary.trainerId,
    title: summary.title,
    notes: summary.notes,
    clonedFromId: summary.clonedFromId,
    meals: summary.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity,
      })),
    })),
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
