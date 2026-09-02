import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutScheduleExerciseId = Brand<string, 'WorkoutScheduleExerciseId'>;

export function toWorkoutScheduleExerciseId(value: string): WorkoutScheduleExerciseId {
  return value as WorkoutScheduleExerciseId;
}
