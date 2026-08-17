import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { UserId } from '../../../domain/shared/user-id';

export interface LogPrescribedFoodCommand {
  readonly clientUserId: UserId;
  readonly logDate: CalendarDate;
  readonly dietPlanMealItemId: DietPlanMealItemId;
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly quantity: number;
  readonly mealSlot: MealSlot;
}

export interface UnlogPrescribedFoodCommand {
  readonly clientUserId: UserId;
  readonly logDate: CalendarDate;
  readonly dietPlanMealItemId: DietPlanMealItemId;
}

export interface LogPrescribedFood {
  log(command: LogPrescribedFoodCommand): Promise<void>;
  unlog(command: UnlogPrescribedFoodCommand): Promise<void>;
}
