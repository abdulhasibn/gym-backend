import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';

export interface SeedCatalogPort {
  hasLiveSeedServing(foodItemId: FoodItemId, servingId: FoodServingId): Promise<boolean>;
}
