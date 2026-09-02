import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutPlanTemplateId = Brand<string, 'WorkoutPlanTemplateId'>;

export function toWorkoutPlanTemplateId(value: string): WorkoutPlanTemplateId {
  return value as WorkoutPlanTemplateId;
}
