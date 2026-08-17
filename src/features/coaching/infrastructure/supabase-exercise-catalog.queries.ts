import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ExerciseCatalogQueries, ExerciseSearchHit } from '../domain/exercise-catalog.queries';
import { toExerciseSearchHit } from './coaching.mapper';

export class SupabaseExerciseCatalogQueries implements ExerciseCatalogQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async searchSeed(query: string): Promise<readonly ExerciseSearchHit[]> {
    const { data, error } = await this.client
      .from('exercise_items')
      .select('*')
      .eq('source', 'seed')
      .eq('active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to search exercise catalog', {
        cause: error,
      });
    }

    const needle = query.trim().toLowerCase();
    const hits = (data ?? [])
      .map((row) => toExerciseSearchHit(row))
      .filter((hit) => matchesSearch(hit, needle));
    return hits.slice(0, 20);
  }
}

function matchesSearch(hit: ExerciseSearchHit, needle: string): boolean {
  if (needle.length === 0) {
    return true;
  }
  if (hit.name.toLowerCase().includes(needle)) {
    return true;
  }
  return hit.aliases.some((alias) => alias.toLowerCase().includes(needle));
}
