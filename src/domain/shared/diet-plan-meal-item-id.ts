import type { Brand } from '../../shared/primitives/brand';

export type DietPlanMealItemId = Brand<string, 'DietPlanMealItemId'>;

export function toDietPlanMealItemId(value: string): DietPlanMealItemId {
  return value as DietPlanMealItemId;
}
