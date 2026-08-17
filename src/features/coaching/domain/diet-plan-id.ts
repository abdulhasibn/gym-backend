import type { Brand } from '../../../shared/primitives/brand';

export type DietPlanId = Brand<string, 'DietPlanId'>;

export function toDietPlanId(value: string): DietPlanId {
  return value as DietPlanId;
}
