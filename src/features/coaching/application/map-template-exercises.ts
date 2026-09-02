import type { IdGenerator } from '../../../shared/ids/id-generator';
import { toExerciseItemId } from '../domain/exercise-item-id';
import type { WorkoutPlanTemplateExerciseData } from '../domain/workout-plan-template.entity';
import { toWorkoutPlanTemplateExerciseId } from '../domain/workout-plan-template-exercise-id';
import type { PrescribedWorkoutExerciseInput } from './assert-live-seed-exercises';

export function mapTemplateExercises(
  ids: IdGenerator,
  exercises: readonly PrescribedWorkoutExerciseInput[],
): WorkoutPlanTemplateExerciseData[] {
  return exercises.map((exercise, index) => ({
    id: toWorkoutPlanTemplateExerciseId(ids.generate()),
    exerciseItemId: toExerciseItemId(exercise.exerciseItemId),
    sets: exercise.sets,
    reps: exercise.reps,
    notes: exercise.notes,
    sortOrder: index,
  }));
}
