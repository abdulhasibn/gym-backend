import type { Brand } from '../../../shared/primitives/brand';

export type DietPlanTemplateMealItemId = Brand<string, 'DietPlanTemplateMealItemId'>;

export function toDietPlanTemplateMealItemId(value: string): DietPlanTemplateMealItemId {
  return value as DietPlanTemplateMealItemId;
}
