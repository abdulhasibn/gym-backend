import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { UserId } from '../../../domain/shared/user-id';
import type { CalorieLogItemId } from './calorie-log-item-id';

export interface CalorieLogItemSummary {
  readonly id: CalorieLogItemId;
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly quantity: number;
  readonly mealSlot: MealSlot;
  readonly dietPlanMealItemId: DietPlanMealItemId | null;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
}

export interface CalorieLogDaySummary {
  readonly logDate: string;
  readonly totalCalories: number;
  readonly totalProteinG: number;
  readonly totalCarbsG: number;
  readonly totalFatG: number;
  readonly items: readonly CalorieLogItemSummary[];
}

export interface CalorieLogQueries {
  findDay(clientUserId: UserId, logDate: CalendarDate): Promise<CalorieLogDaySummary | null>;

  findLoggedPrescribedItemIds(
    clientUserId: UserId,
    logDate: CalendarDate,
    dietPlanMealItemIds: readonly DietPlanMealItemId[],
  ): Promise<readonly DietPlanMealItemId[]>;
}
