import type {
  ExerciseCatalogQueries,
  ExerciseSearchHit,
} from '../../domain/exercise-catalog.queries';
import type { ExerciseCatalogRepository } from '../../domain/exercise-catalog.repository';
import type { ExerciseItemId } from '../../domain/exercise-item-id';

export class InMemoryExerciseCatalog implements ExerciseCatalogRepository, ExerciseCatalogQueries {
  constructor(private readonly seed = new Map<ExerciseItemId, ExerciseSearchHit>()) {}

  seedExercise(hit: ExerciseSearchHit): void {
    this.seed.set(hit.id, hit);
  }

  async hasLiveSeed(exerciseItemId: ExerciseItemId): Promise<boolean> {
    return this.seed.has(exerciseItemId);
  }

  async searchSeed(query: string): Promise<readonly ExerciseSearchHit[]> {
    const needle = query.trim().toLowerCase();
    const hits = [...this.seed.values()].filter((hit) => {
      if (needle.length === 0) {
        return true;
      }
      if (hit.name.toLowerCase().includes(needle)) {
        return true;
      }
      return hit.aliases.some((alias) => alias.toLowerCase().includes(needle));
    });
    return hits.slice(0, 20);
  }
}
