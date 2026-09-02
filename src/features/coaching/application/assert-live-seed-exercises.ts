import { NotFoundError } from '../../../domain/errors/not-found.error';
import { toExerciseItemId } from '../domain/exercise-item-id';
import type { ExerciseCatalogRepository } from '../domain/exercise-catalog.repository';

export interface PrescribedWorkoutExerciseInput {
  readonly exerciseItemId: string;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
}

export async function assertLiveSeedExercises(
  catalog: ExerciseCatalogRepository,
  exercises: readonly PrescribedWorkoutExerciseInput[],
): Promise<void> {
  for (const exercise of exercises) {
    const exists = await catalog.hasLiveSeed(toExerciseItemId(exercise.exerciseItemId));
    if (!exists) {
      throw new NotFoundError('Seed catalog exercise not found');
    }
  }
}
