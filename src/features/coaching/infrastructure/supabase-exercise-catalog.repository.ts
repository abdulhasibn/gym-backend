import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ExerciseCatalogRepository } from '../domain/exercise-catalog.repository';
import type { ExerciseItemId } from '../domain/exercise-item-id';

export class SupabaseExerciseCatalogRepository implements ExerciseCatalogRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async hasLiveSeed(exerciseItemId: ExerciseItemId): Promise<boolean> {
    const { data, error } = await this.client
      .from('exercise_items')
      .select('id')
      .eq('id', exerciseItemId)
      .eq('source', 'seed')
      .eq('active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read exercise catalog', { cause: error });
    }
    return data !== null;
  }
}
