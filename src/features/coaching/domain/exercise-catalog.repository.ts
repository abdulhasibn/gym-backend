import type { ExerciseItemId } from './exercise-item-id';

export interface ExerciseCatalogRepository {
  hasLiveSeed(exerciseItemId: ExerciseItemId): Promise<boolean>;
}
