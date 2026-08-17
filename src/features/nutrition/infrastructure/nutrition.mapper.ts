import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import { parseFoodServingUnit } from '../../../domain/shared/food-serving-unit';
import { parseMealSlot } from '../../../domain/shared/meal-slot';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { CalorieLogEntry } from '../domain/calorie-log-entry.entity';
import { toCalorieLogEntryId } from '../domain/calorie-log-entry-id';
import { toCalorieLogItemId } from '../domain/calorie-log-item-id';
import type { CalorieLogDaySummary, CalorieLogItemSummary } from '../domain/calorie-log.queries';
import type { FoodSearchHit, FoodServingHit } from '../domain/food-catalog.queries';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';

type FoodRow = Database['public']['Tables']['food_items']['Row'];
type ServingRow = Database['public']['Tables']['food_item_servings']['Row'];
type EntryRow = Database['public']['Tables']['calorie_log_entries']['Row'];
type ItemRow = Database['public']['Tables']['calorie_log_items']['Row'];

export function toFoodSearchHit(row: FoodRow, servings: readonly ServingRow[]): FoodSearchHit {
  const live = servings.filter((serving) => serving.deleted_at === null);
  if (live.length === 0) {
    throw new DataIntegrityError('Seed food is missing servings');
  }
  return {
    id: toFoodItemId(row.id),
    name: row.name,
    aliases: row.aliases ?? [],
    per100g: {
      calories: Number(row.calories),
      proteinG: Number(row.protein_g ?? 0),
      carbsG: Number(row.carbs_g ?? 0),
      fatG: Number(row.fat_g ?? 0),
    },
    servings: live.map(toFoodServingHit).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function toFoodServingHit(row: ServingRow): FoodServingHit {
  return {
    id: toFoodServingId(row.id),
    unit: parseFoodServingUnit(row.unit),
    label: row.label,
    grams: Number(row.grams),
    isDefault: row.is_default,
    sortOrder: row.sort_order,
  };
}

export function toCalorieLogEntry(row: EntryRow, items: readonly ItemRow[]): CalorieLogEntry {
  try {
    return CalorieLogEntry.reconstitute({
      id: toCalorieLogEntryId(row.id),
      clientUserId: toUserId(row.client_user_id),
      logDate: CalendarDate.create(row.log_date),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      items: items.map(toCalorieLogItemData),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored calorie log is invalid', { cause: error });
  }
}

function toCalorieLogItemData(row: ItemRow) {
  return {
    id: toCalorieLogItemId(row.id),
    foodItemId: toFoodItemId(row.food_item_id),
    servingId: toFoodServingId(row.serving_id),
    quantity: ServingQuantity.create(Number(row.quantity)),
    mealSlot: parseMealSlot(row.meal_slot),
    dietPlanMealItemId:
      row.diet_plan_meal_item_id === null ? null : toDietPlanMealItemId(row.diet_plan_meal_item_id),
    calories: Number(row.calories),
    proteinG: Number(row.protein_g ?? 0),
    carbsG: Number(row.carbs_g ?? 0),
    fatG: Number(row.fat_g ?? 0),
    deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
  };
}

export function toCalorieLogDaySummary(
  row: EntryRow,
  items: readonly ItemRow[],
): CalorieLogDaySummary {
  const live = items.filter((item) => item.deleted_at === null).map(toCalorieLogItemSummary);
  return {
    logDate: row.log_date,
    totalCalories: Number(row.total_calories),
    totalProteinG: Number(row.total_protein_g),
    totalCarbsG: Number(row.total_carbs_g),
    totalFatG: Number(row.total_fat_g),
    items: live,
  };
}

function toCalorieLogItemSummary(row: ItemRow): CalorieLogItemSummary {
  return {
    id: toCalorieLogItemId(row.id),
    foodItemId: toFoodItemId(row.food_item_id),
    servingId: toFoodServingId(row.serving_id),
    quantity: Number(row.quantity),
    mealSlot: parseMealSlot(row.meal_slot),
    dietPlanMealItemId:
      row.diet_plan_meal_item_id === null ? null : toDietPlanMealItemId(row.diet_plan_meal_item_id),
    calories: Number(row.calories),
    proteinG: Number(row.protein_g ?? 0),
    carbsG: Number(row.carbs_g ?? 0),
    fatG: Number(row.fat_g ?? 0),
  };
}

export function toCalorieLogEntryInsert(
  entry: CalorieLogEntry,
): Database['public']['Tables']['calorie_log_entries']['Insert'] {
  return {
    id: entry.id,
    client_user_id: entry.clientUserId,
    log_date: entry.logDate.value,
    total_calories: entry.totalCalories,
    total_protein_g: entry.totalProteinG,
    total_carbs_g: entry.totalCarbsG,
    total_fat_g: entry.totalFatG,
    deleted_at: entry.deletedAt?.toISOString() ?? null,
    created_at: entry.createdAt.toISOString(),
  };
}

export function toCalorieLogEntryUpdate(
  entry: CalorieLogEntry,
): Database['public']['Tables']['calorie_log_entries']['Update'] {
  return {
    total_calories: entry.totalCalories,
    total_protein_g: entry.totalProteinG,
    total_carbs_g: entry.totalCarbsG,
    total_fat_g: entry.totalFatG,
    deleted_at: entry.deletedAt?.toISOString() ?? null,
  };
}

export function toCalorieLogItemUpsert(
  entry: CalorieLogEntry,
): Database['public']['Tables']['calorie_log_items']['Insert'][] {
  return entry.items.map((item) => ({
    id: item.id,
    calorie_log_entry_id: entry.id,
    food_item_id: item.foodItemId,
    serving_id: item.servingId,
    quantity: item.quantity.value,
    meal_slot: item.mealSlot,
    diet_plan_meal_item_id: item.dietPlanMealItemId,
    calories: item.calories,
    protein_g: item.proteinG,
    carbs_g: item.carbsG,
    fat_g: item.fatG,
    deleted_at: item.deletedAt?.toISOString() ?? null,
  }));
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
