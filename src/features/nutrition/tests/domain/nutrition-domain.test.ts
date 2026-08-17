import { describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toDietPlanMealItemId } from '../../../../domain/shared/diet-plan-meal-item-id';
import { toFoodItemId } from '../../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../../domain/shared/food-serving-id';
import { ServingQuantity } from '../../../../domain/shared/serving-quantity.value-object';
import { toUserId } from '../../../../domain/shared/user-id';
import { scaleNutrients } from '../../domain/nutrients';
import { AlreadyLoggedPrescribedError } from '../../domain/already-logged-prescribed.error';
import { CalorieLogEntry } from '../../domain/calorie-log-entry.entity';
import { toCalorieLogEntryId } from '../../domain/calorie-log-entry-id';
import { toCalorieLogItemId } from '../../domain/calorie-log-item-id';
import { InvalidNutritionError } from '../../domain/invalid-nutrition.error';
import { parseFoodServingUnit } from '../../../../domain/shared/food-serving-unit';

const userId = toUserId('11111111-1111-4111-8111-111111111111');
const now = new Date('2026-08-17T00:00:00.000Z');

describe('scaleNutrients', () => {
  it('scales per-100g macros by grams and quantity', () => {
    const scaled = scaleNutrients(
      { calories: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 },
      150,
      1,
    );
    expect(scaled.calories).toBe(195);
    expect(scaled.proteinG).toBe(4.05);
    expect(scaled.carbsG).toBe(42.3);
    expect(scaled.fatG).toBe(0.45);
  });
});

describe('parseFoodServingUnit', () => {
  it('rejects unknown units', () => {
    expect(() => parseFoodServingUnit('BOWL')).toThrow('Food serving unit is invalid');
  });
});

describe('CalorieLogEntry', () => {
  it('rejects a second live plan-linked item for the same diet line', () => {
    const entry = CalorieLogEntry.create({
      id: toCalorieLogEntryId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: userId,
      logDate: CalendarDate.create('2026-08-17'),
      now,
    });
    const prescribedId = toDietPlanMealItemId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    const food = toFoodItemId('f00d0000-0000-4000-8000-000000000001');
    const serving = toFoodServingId('f00d5e04-0000-4000-8000-000000010003');
    entry.addPrescribed({
      id: toCalorieLogItemId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      foodItemId: food,
      servingId: serving,
      quantity: ServingQuantity.create(1),
      mealSlot: 'BREAKFAST',
      dietPlanMealItemId: prescribedId,
      calories: 40,
      proteinG: 1,
      carbsG: 8,
      fatG: 0,
    });
    expect(() =>
      entry.addPrescribed({
        id: toCalorieLogItemId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        foodItemId: food,
        servingId: serving,
        quantity: ServingQuantity.create(1),
        mealSlot: 'BREAKFAST',
        dietPlanMealItemId: prescribedId,
        calories: 40,
        proteinG: 1,
        carbsG: 8,
        fatG: 0,
      }),
    ).toThrow(AlreadyLoggedPrescribedError);
  });

  it('refuses extra-delete of a plan-linked item', () => {
    const entry = CalorieLogEntry.create({
      id: toCalorieLogEntryId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: userId,
      logDate: CalendarDate.create('2026-08-17'),
      now,
    });
    const itemId = toCalorieLogItemId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    entry.addPrescribed({
      id: itemId,
      foodItemId: toFoodItemId('f00d0000-0000-4000-8000-000000000001'),
      servingId: toFoodServingId('f00d5e04-0000-4000-8000-000000010003'),
      quantity: ServingQuantity.create(1),
      mealSlot: 'BREAKFAST',
      dietPlanMealItemId: toDietPlanMealItemId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
      calories: 40,
      proteinG: 1,
      carbsG: 8,
      fatG: 0,
    });
    expect(() => entry.softDeleteExtra(itemId, now)).toThrow(InvalidNutritionError);
  });
});
