import type { Brand } from '../../shared/primitives/brand';

export type FoodServingId = Brand<string, 'FoodServingId'>;

export function toFoodServingId(value: string): FoodServingId {
  return value as FoodServingId;
}
