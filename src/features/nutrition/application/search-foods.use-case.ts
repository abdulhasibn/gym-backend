import type { FoodCatalogQueries } from '../domain/food-catalog.queries';
import { toFoodSearchDto, type FoodSearchDto } from './nutrition.dto';

export class SearchFoodsUseCase {
  constructor(private readonly catalog: FoodCatalogQueries) {}

  async execute(query: string): Promise<readonly FoodSearchDto[]> {
    const hits = await this.catalog.searchSeed(query);
    return hits.map(toFoodSearchDto);
  }
}
