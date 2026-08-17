import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { FoodServingUnit } from '../../../domain/shared/food-serving-unit';
import type { NutrientsPer100g } from './nutrients';

export interface FoodServingHit {
  readonly id: FoodServingId;
  readonly unit: FoodServingUnit;
  readonly label: string;
  readonly grams: number;
  readonly isDefault: boolean;
  readonly sortOrder: number;
}

export interface FoodSearchHit {
  readonly id: FoodItemId;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly per100g: NutrientsPer100g;
  readonly servings: readonly FoodServingHit[];
}

export interface FoodCatalogQueries {
  searchSeed(query: string): Promise<readonly FoodSearchHit[]>;
}
