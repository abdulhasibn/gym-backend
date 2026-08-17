import type { FoodServingUnit } from '../../../domain/shared/food-serving-unit';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import { MEAL_SLOTS } from '../../../domain/shared/meal-slot';
import { scaleNutrients } from '../domain/nutrients';
import type { CalorieLogDaySummary, CalorieLogItemSummary } from '../domain/calorie-log.queries';
import type { FoodSearchHit } from '../domain/food-catalog.queries';

export interface FoodUnitDto {
  readonly unit: FoodServingUnit;
  readonly label: string;
  readonly grams: number;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly isDefault: boolean;
}

export interface FoodSearchDto {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly caloriesPer100g: number;
  readonly proteinGPer100g: number;
  readonly carbsGPer100g: number;
  readonly fatGPer100g: number;
  readonly defaultUnit: FoodServingUnit;
  readonly units: readonly FoodUnitDto[];
}

export interface CalorieLogItemDto {
  readonly id: string;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
  readonly mealSlot: MealSlot;
  readonly dietPlanMealItemId: string | null;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly isExtra: boolean;
}

export interface CalorieLogSlotDto {
  readonly mealSlot: MealSlot;
  readonly totalCalories: number;
  readonly totalProteinG: number;
  readonly totalCarbsG: number;
  readonly totalFatG: number;
  readonly items: readonly CalorieLogItemDto[];
}

export interface CalorieLogDto {
  readonly logDate: string;
  readonly totalCalories: number;
  readonly totalProteinG: number;
  readonly totalCarbsG: number;
  readonly totalFatG: number;
  readonly slots: readonly CalorieLogSlotDto[];
}

export function toFoodSearchDto(hit: FoodSearchHit): FoodSearchDto {
  const units = [...hit.servings]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((serving) => {
      const scaled = scaleNutrients(hit.per100g, serving.grams, 1);
      return {
        unit: serving.unit,
        label: serving.label,
        grams: serving.grams,
        calories: scaled.calories,
        proteinG: scaled.proteinG,
        carbsG: scaled.carbsG,
        fatG: scaled.fatG,
        isDefault: serving.isDefault,
      };
    });
  const defaultServing = hit.servings.find((serving) => serving.isDefault) ?? hit.servings[0];
  if (defaultServing === undefined) {
    throw new Error('Food has no servings');
  }
  return {
    id: hit.id,
    name: hit.name,
    aliases: hit.aliases,
    caloriesPer100g: hit.per100g.calories,
    proteinGPer100g: hit.per100g.proteinG,
    carbsGPer100g: hit.per100g.carbsG,
    fatGPer100g: hit.per100g.fatG,
    defaultUnit: defaultServing.unit,
    units,
  };
}

export function emptyCalorieLogDto(logDate: string): CalorieLogDto {
  return {
    logDate,
    totalCalories: 0,
    totalProteinG: 0,
    totalCarbsG: 0,
    totalFatG: 0,
    slots: MEAL_SLOTS.map((mealSlot) => ({
      mealSlot,
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      items: [],
    })),
  };
}

export function toCalorieLogDto(summary: CalorieLogDaySummary): CalorieLogDto {
  return assembleCalorieLogDto(
    summary.logDate,
    summary.totalCalories,
    summary.totalProteinG,
    summary.totalCarbsG,
    summary.totalFatG,
    summary.items.map(toCalorieLogItemDto),
  );
}

export function toCalorieLogDtoFromEntry(entry: {
  readonly logDate: { readonly value: string };
  readonly totalCalories: number;
  readonly totalProteinG: number;
  readonly totalCarbsG: number;
  readonly totalFatG: number;
  readonly liveItems: readonly {
    readonly id: string;
    readonly foodItemId: string;
    readonly servingId: string;
    readonly quantity: { readonly value: number };
    readonly mealSlot: MealSlot;
    readonly dietPlanMealItemId: string | null;
    readonly calories: number;
    readonly proteinG: number;
    readonly carbsG: number;
    readonly fatG: number;
  }[];
}): CalorieLogDto {
  return assembleCalorieLogDto(
    entry.logDate.value,
    entry.totalCalories,
    entry.totalProteinG,
    entry.totalCarbsG,
    entry.totalFatG,
    entry.liveItems.map((item) => ({
      id: item.id,
      foodItemId: item.foodItemId,
      servingId: item.servingId,
      quantity: item.quantity.value,
      mealSlot: item.mealSlot,
      dietPlanMealItemId: item.dietPlanMealItemId,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      isExtra: item.dietPlanMealItemId === null,
    })),
  );
}

function assembleCalorieLogDto(
  logDate: string,
  totalCalories: number,
  totalProteinG: number,
  totalCarbsG: number,
  totalFatG: number,
  items: readonly CalorieLogItemDto[],
): CalorieLogDto {
  return {
    logDate,
    totalCalories,
    totalProteinG,
    totalCarbsG,
    totalFatG,
    slots: MEAL_SLOTS.map((mealSlot) => {
      const slotItems = items.filter((item) => item.mealSlot === mealSlot);
      return {
        mealSlot,
        totalCalories: round2(slotItems.reduce((sum, item) => sum + item.calories, 0)),
        totalProteinG: round2(slotItems.reduce((sum, item) => sum + item.proteinG, 0)),
        totalCarbsG: round2(slotItems.reduce((sum, item) => sum + item.carbsG, 0)),
        totalFatG: round2(slotItems.reduce((sum, item) => sum + item.fatG, 0)),
        items: slotItems,
      };
    }),
  };
}

function toCalorieLogItemDto(item: CalorieLogItemSummary): CalorieLogItemDto {
  return {
    id: item.id,
    foodItemId: item.foodItemId,
    servingId: item.servingId,
    quantity: item.quantity,
    mealSlot: item.mealSlot,
    dietPlanMealItemId: item.dietPlanMealItemId,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    isExtra: item.dietPlanMealItemId === null,
  };
}

export function hasCaloriesGrant(classGrants: readonly string[]): boolean {
  return classGrants.includes('CALORIES');
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
