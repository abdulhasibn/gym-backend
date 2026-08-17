import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutPlanDayId = Brand<string, 'WorkoutPlanDayId'>;

export function toWorkoutPlanDayId(value: string): WorkoutPlanDayId {
  return value as WorkoutPlanDayId;
}
