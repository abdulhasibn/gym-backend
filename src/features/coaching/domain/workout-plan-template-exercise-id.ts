import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutPlanTemplateExerciseId = Brand<string, 'WorkoutPlanTemplateExerciseId'>;

export function toWorkoutPlanTemplateExerciseId(value: string): WorkoutPlanTemplateExerciseId {
  return value as WorkoutPlanTemplateExerciseId;
}
