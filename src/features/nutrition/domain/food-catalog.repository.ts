import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { NutrientsPer100g } from './nutrients';

export interface SeedFoodServing {
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly grams: number;
  readonly per100g: NutrientsPer100g;
}

export interface FoodCatalogRepository {
  findLiveSeedServing(
    foodItemId: FoodItemId,
    servingId: FoodServingId,
  ): Promise<SeedFoodServing | null>;
}
