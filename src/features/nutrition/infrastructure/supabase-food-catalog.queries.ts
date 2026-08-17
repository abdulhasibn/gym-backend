import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { FoodCatalogQueries, FoodSearchHit } from '../domain/food-catalog.queries';
import { toFoodSearchHit } from './nutrition.mapper';

type FoodWithServings = Database['public']['Tables']['food_items']['Row'] & {
  food_item_servings: Database['public']['Tables']['food_item_servings']['Row'][] | null;
};

export class SupabaseFoodCatalogQueries implements FoodCatalogQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async searchSeed(query: string): Promise<readonly FoodSearchHit[]> {
    const { data, error } = await this.client
      .from('food_items')
      .select('*, food_item_servings(*)')
      .eq('source', 'seed')
      .eq('active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to search food catalog', { cause: error });
    }

    const needle = query.trim().toLowerCase();
    const hits = ((data ?? []) as FoodWithServings[])
      .map((row) => toFoodSearchHit(row, row.food_item_servings ?? []))
      .filter((hit) => matchesSearch(hit, needle));
    return hits.slice(0, 20);
  }
}

function matchesSearch(hit: FoodSearchHit, needle: string): boolean {
  if (needle.length === 0) {
    return true;
  }
  if (hit.name.toLowerCase().includes(needle)) {
    return true;
  }
  return hit.aliases.some((alias) => alias.toLowerCase().includes(needle));
}
