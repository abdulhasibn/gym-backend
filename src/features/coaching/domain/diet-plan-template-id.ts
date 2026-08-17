import type { Brand } from '../../../shared/primitives/brand';

export type DietPlanTemplateId = Brand<string, 'DietPlanTemplateId'>;

export function toDietPlanTemplateId(value: string): DietPlanTemplateId {
  return value as DietPlanTemplateId;
}
