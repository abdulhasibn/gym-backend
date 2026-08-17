import type { ExerciseCatalogQueries } from '../domain/exercise-catalog.queries';
import { toExerciseSearchDto, type ExerciseSearchDto } from './coaching.dto';

export class SearchExercisesUseCase {
  constructor(private readonly catalog: ExerciseCatalogQueries) {}

  async execute(query: string): Promise<readonly ExerciseSearchDto[]> {
    const hits = await this.catalog.searchSeed(query);
    return hits.map(toExerciseSearchDto);
  }
}
