import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { ClientSelfPolicy } from './application/client-self.policy';
import { GetMyCalorieLogUseCase } from './application/get-my-calorie-log.use-case';
import { GetStaffClientCalorieLogUseCase } from './application/get-staff-client-calorie-log.use-case';
import { LogExtraFoodUseCase } from './application/log-extra-food.use-case';
import { LogPrescribedFoodUseCase } from './application/log-prescribed-food.use-case';
import { SearchFoodsUseCase } from './application/search-foods.use-case';
import { StaffCalorieReadPolicy } from './application/staff-calorie-read.policy';
import { UnlogCalorieItemUseCase } from './application/unlog-calorie-item.use-case';
import type { ClientDataGrantGate } from './domain/client-data-grant.gate';
import type { LiveGymAdminPort, LiveTrainerPort } from './domain/live-staff.port';
import { todayInKolkata } from './infrastructure/kolkata-date';
import { SupabaseCalorieLogQueries } from './infrastructure/supabase-calorie-log.queries';
import { SupabaseCalorieLogRepository } from './infrastructure/supabase-calorie-log.repository';
import { SupabaseFoodCatalogQueries } from './infrastructure/supabase-food-catalog.queries';
import { SupabaseFoodCatalogRepository } from './infrastructure/supabase-food-catalog.repository';
import { NutritionController } from './presentation/nutrition.controller';
import { mapNutritionError } from './presentation/nutrition.error-mapper';
import {
  createFoodsRouter,
  createMeCalorieLogRouter,
  createStaffClientCalorieLogRouter,
} from './presentation/nutrition.routes';

export interface NutritionStaffPorts {
  readonly liveGymAdmin: LiveGymAdminPort;
  readonly liveTrainer: LiveTrainerPort;
  readonly dataGrantGate: ClientDataGrantGate;
}

export function composeNutritionFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  staffPorts: NutritionStaffPorts,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const catalog = new SupabaseFoodCatalogRepository(dataClient);
  const catalogQueries = new SupabaseFoodCatalogQueries(dataClient);
  const logs = new SupabaseCalorieLogRepository(dataClient);
  const logQueries = new SupabaseCalorieLogQueries(dataClient);
  const selfPolicy = new ClientSelfPolicy();
  const staffPolicy = new StaffCalorieReadPolicy(staffPorts.liveGymAdmin, staffPorts.liveTrainer);

  const logPrescribedFood = new LogPrescribedFoodUseCase(catalog, logs, clock, ids);

  const controller = new NutritionController(
    new SearchFoodsUseCase(catalogQueries),
    new GetMyCalorieLogUseCase(selfPolicy, logQueries, clock, todayInKolkata),
    new LogExtraFoodUseCase(selfPolicy, catalog, logs, clock, ids, todayInKolkata),
    new UnlogCalorieItemUseCase(selfPolicy, logs, clock),
    new GetStaffClientCalorieLogUseCase(
      staffPolicy,
      logQueries,
      staffPorts.dataGrantGate,
      clock,
      todayInKolkata,
    ),
  );

  return {
    foodsRouter: createFoodsRouter(controller, authenticate),
    meCalorieLogRouter: createMeCalorieLogRouter(controller, authenticate),
    staffClientCalorieLogRouter: createStaffClientCalorieLogRouter(controller, authenticate),
    errorMapper: mapNutritionError,
    logPrescribedFood,
    catalog,
    calorieLogQueries: logQueries,
  };
}
