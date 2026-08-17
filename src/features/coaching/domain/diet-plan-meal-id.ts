import type { Brand } from '../../../shared/primitives/brand';

export type DietPlanMealId = Brand<string, 'DietPlanMealId'>;

export function toDietPlanMealId(value: string): DietPlanMealId {
  return value as DietPlanMealId;
}
