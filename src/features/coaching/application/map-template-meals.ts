import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { DietPlanMealData } from '../domain/diet-plan.entity';
import { toDietPlanMealId } from '../domain/diet-plan-meal-id';
import type {
  DietPlanTemplate,
  DietPlanTemplateMealData,
} from '../domain/diet-plan-template.entity';
import { toDietPlanTemplateMealId } from '../domain/diet-plan-template-meal-id';
import { toDietPlanTemplateMealItemId } from '../domain/diet-plan-template-meal-item-id';
import type { PrescribedMealInput } from './assert-live-seed-meals';

export function mapTemplateMeals(
  ids: IdGenerator,
  meals: readonly PrescribedMealInput[],
): DietPlanTemplateMealData[] {
  return meals.map((meal, index) => ({
    id: toDietPlanTemplateMealId(ids.generate()),
    mealSlot: meal.mealSlot,
    sortOrder: index,
    items: meal.items.map((item) => ({
      id: toDietPlanTemplateMealItemId(ids.generate()),
      foodItemId: toFoodItemId(item.foodItemId),
      servingId: toFoodServingId(item.servingId),
      quantity: ServingQuantity.create(item.quantity),
    })),
  }));
}

export function copyTemplateMealsToPlan(
  ids: IdGenerator,
  meals: DietPlanTemplate['meals'],
): DietPlanMealData[] {
  return meals.map((meal, index) => ({
    id: toDietPlanMealId(ids.generate()),
    mealSlot: meal.mealSlot,
    sortOrder: index,
    items: meal.items.map((item) => ({
      id: toDietPlanMealItemId(ids.generate()),
      foodItemId: item.foodItemId,
      servingId: item.servingId,
      quantity: item.quantity,
    })),
  }));
}
