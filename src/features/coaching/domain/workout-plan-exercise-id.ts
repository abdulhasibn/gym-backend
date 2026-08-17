import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutPlanExerciseId = Brand<string, 'WorkoutPlanExerciseId'>;

export function toWorkoutPlanExerciseId(value: string): WorkoutPlanExerciseId {
  return value as WorkoutPlanExerciseId;
}
