export const MEAL_SLOTS = [
  'BREAKFAST',
  'MORNING_SNACK',
  'LUNCH',
  'EVENING_SNACK',
  'DINNER',
] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export function isMealSlot(value: string): value is MealSlot {
  return (MEAL_SLOTS as readonly string[]).includes(value);
}

export function parseMealSlot(value: string): MealSlot {
  if (!isMealSlot(value)) {
    throw new Error('Meal slot is invalid');
  }
  return value;
}
