import type { Brand } from '../../../shared/primitives/brand';

export type CalorieLogEntryId = Brand<string, 'CalorieLogEntryId'>;

export function toCalorieLogEntryId(value: string): CalorieLogEntryId {
  return value as CalorieLogEntryId;
}
