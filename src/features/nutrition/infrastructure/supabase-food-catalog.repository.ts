import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { FoodCatalogRepository, SeedFoodServing } from '../domain/food-catalog.repository';

type FoodWithServings = Database['public']['Tables']['food_items']['Row'] & {
  food_item_servings: Database['public']['Tables']['food_item_servings']['Row'][] | null;
};

export class SupabaseFoodCatalogRepository implements FoodCatalogRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findLiveSeedServing(
    foodItemId: FoodItemId,
    servingId: FoodServingId,
  ): Promise<SeedFoodServing | null> {
    const { data, error } = await this.client
      .from('food_items')
      .select('*, food_item_servings(*)')
      .eq('id', foodItemId)
      .eq('source', 'seed')
      .eq('active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read food catalog item', { cause: error });
    }
    if (data === null) {
      return null;
    }

    const serv = ((data as FoodWithServings).food_item_servings ?? []).find(
      (row) => row.id === servingId && row.deleted_at === null,
    );
    if (serv === undefined) {
      return null;
    }

    return {
      foodItemId,
      servingId,
      grams: Number(serv.grams),
      per100g: {
        calories: Number(data.calories),
        proteinG: Number(data.protein_g ?? 0),
        carbsG: Number(data.carbs_g ?? 0),
        fatG: Number(data.fat_g ?? 0),
      },
    };
  }
}
