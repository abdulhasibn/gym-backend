import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { UserId } from '../../../domain/shared/user-id';
import { AlreadyLoggedPrescribedError } from './already-logged-prescribed.error';
import type { CalorieLogEntryId } from './calorie-log-entry-id';
import type { CalorieLogItemId } from './calorie-log-item-id';
import { InvalidNutritionError } from './invalid-nutrition.error';
import type { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';

export interface CalorieLogItemData {
  readonly id: CalorieLogItemId;
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly quantity: ServingQuantity;
  readonly mealSlot: MealSlot;
  readonly dietPlanMealItemId: DietPlanMealItemId | null;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly deletedAt: Date | null;
}

export interface CalorieLogEntryData {
  readonly id: CalorieLogEntryId;
  readonly clientUserId: UserId;
  readonly logDate: CalendarDate;
  readonly items: readonly CalorieLogItemData[];
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
}

export interface CreateCalorieLogEntryProps {
  readonly id: CalorieLogEntryId;
  readonly clientUserId: UserId;
  readonly logDate: CalendarDate;
  readonly now: Date;
}

export interface AddCalorieLogItemProps {
  readonly id: CalorieLogItemId;
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly quantity: ServingQuantity;
  readonly mealSlot: MealSlot;
  readonly dietPlanMealItemId: DietPlanMealItemId | null;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
}

export class CalorieLogEntry {
  private constructor(private data: CalorieLogEntryData) {}

  static create(props: CreateCalorieLogEntryProps): CalorieLogEntry {
    return new CalorieLogEntry({
      id: props.id,
      clientUserId: props.clientUserId,
      logDate: props.logDate,
      items: [],
      deletedAt: null,
      createdAt: props.now,
    });
  }

  static reconstitute(data: CalorieLogEntryData): CalorieLogEntry {
    return new CalorieLogEntry(data);
  }

  get id(): CalorieLogEntryId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get logDate(): CalendarDate {
    return this.data.logDate;
  }

  get items(): readonly CalorieLogItemData[] {
    return this.data.items;
  }

  get liveItems(): readonly CalorieLogItemData[] {
    return this.data.items.filter((item) => item.deletedAt === null);
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get totalCalories(): number {
    return round2(this.liveItems.reduce((sum, item) => sum + item.calories, 0));
  }

  get totalProteinG(): number {
    return round2(this.liveItems.reduce((sum, item) => sum + item.proteinG, 0));
  }

  get totalCarbsG(): number {
    return round2(this.liveItems.reduce((sum, item) => sum + item.carbsG, 0));
  }

  get totalFatG(): number {
    return round2(this.liveItems.reduce((sum, item) => sum + item.fatG, 0));
  }

  addExtra(props: Omit<AddCalorieLogItemProps, 'dietPlanMealItemId'>): void {
    this.appendItem({ ...props, dietPlanMealItemId: null });
  }

  addPrescribed(props: AddCalorieLogItemProps & { dietPlanMealItemId: DietPlanMealItemId }): void {
    const already = this.liveItems.some(
      (item) => item.dietPlanMealItemId === props.dietPlanMealItemId,
    );
    if (already) {
      throw new AlreadyLoggedPrescribedError();
    }
    this.appendItem(props);
  }

  softDeleteExtra(itemId: CalorieLogItemId, now: Date): void {
    const item = this.liveItems.find((row) => row.id === itemId);
    if (item === undefined) {
      throw new InvalidNutritionError('Calorie log item not found');
    }
    if (item.dietPlanMealItemId !== null) {
      throw new InvalidNutritionError('Plan-linked items must be uncompleted on the diet plan');
    }
    this.markDeleted(itemId, now);
  }

  unlogPrescribed(dietPlanMealItemId: DietPlanMealItemId, now: Date): void {
    const item = this.liveItems.find((row) => row.dietPlanMealItemId === dietPlanMealItemId);
    if (item === undefined) {
      throw new InvalidNutritionError('Prescribed item is not logged for this day');
    }
    this.markDeleted(item.id, now);
  }

  private appendItem(props: AddCalorieLogItemProps): void {
    this.data = {
      ...this.data,
      items: [
        ...this.data.items,
        {
          ...props,
          deletedAt: null,
        },
      ],
    };
  }

  private markDeleted(itemId: CalorieLogItemId, now: Date): void {
    this.data = {
      ...this.data,
      items: this.data.items.map((item) =>
        item.id === itemId ? { ...item, deletedAt: now } : item,
      ),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
