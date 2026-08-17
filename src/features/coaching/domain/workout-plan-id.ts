import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutPlanId = Brand<string, 'WorkoutPlanId'>;

export function toWorkoutPlanId(value: string): WorkoutPlanId {
  return value as WorkoutPlanId;
}
