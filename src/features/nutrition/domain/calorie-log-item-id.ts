import type { Brand } from '../../../shared/primitives/brand';

export type CalorieLogItemId = Brand<string, 'CalorieLogItemId'>;

export function toCalorieLogItemId(value: string): CalorieLogItemId {
  return value as CalorieLogItemId;
}
