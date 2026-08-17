import type { Brand } from '../../../shared/primitives/brand';

export type DietPlanTemplateMealId = Brand<string, 'DietPlanTemplateMealId'>;

export function toDietPlanTemplateMealId(value: string): DietPlanTemplateMealId {
  return value as DietPlanTemplateMealId;
}
