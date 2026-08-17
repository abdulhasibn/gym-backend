import type { Brand } from '../../shared/primitives/brand';

export type FoodItemId = Brand<string, 'FoodItemId'>;

export function toFoodItemId(value: string): FoodItemId {
  return value as FoodItemId;
}
