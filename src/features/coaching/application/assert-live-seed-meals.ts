import { NotFoundError } from '../../../domain/errors/not-found.error';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { SeedCatalogPort } from '../domain/seed-catalog.port';

export interface PrescribedMealItemInput {
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
}

export interface PrescribedMealInput {
  readonly mealSlot: MealSlot;
  readonly items: readonly PrescribedMealItemInput[];
}

export async function assertLiveSeedMeals(
  catalog: SeedCatalogPort,
  meals: readonly PrescribedMealInput[],
): Promise<void> {
  for (const meal of meals) {
    for (const item of meal.items) {
      const exists = await catalog.hasLiveSeedServing(
        toFoodItemId(item.foodItemId),
        toFoodServingId(item.servingId),
      );
      if (!exists) {
        throw new NotFoundError('Seed catalog food or serving not found');
      }
    }
  }
}
