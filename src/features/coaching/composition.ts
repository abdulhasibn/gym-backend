import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { AssignDietPlanUseCase } from './application/assign-diet-plan.use-case';
import { CompleteDietItemUseCase } from './application/complete-diet-item.use-case';
import { DietAssignPolicy } from './application/diet-assign.policy';
import { DietClientPolicy } from './application/diet-client.policy';
import { GetMyDietPlanUseCase } from './application/get-my-diet-plan.use-case';
import { GetStaffDietPlanUseCase } from './application/get-staff-diet-plan.use-case';
import { UncompleteDietItemUseCase } from './application/uncomplete-diet-item.use-case';
import type { CoachingEntitlementPort } from './domain/coaching-entitlement.port';
import type { GymLocalClock } from './domain/gym-local-clock.port';
import type { LiveGymAdminPort, LiveTrainerProfilePort } from './domain/live-staff.port';
import type { LogPrescribedFood } from './domain/log-prescribed-food.port';
import type { PrescribedDiaryQueries } from './domain/prescribed-diary.queries';
import type { SeedCatalogPort } from './domain/seed-catalog.port';
import { SupabaseDietPlanQueries } from './infrastructure/supabase-diet-plan.queries';
import { SupabaseDietPlanRepository } from './infrastructure/supabase-diet-plan.repository';
import { CoachingController } from './presentation/coaching.controller';
import { mapCoachingError } from './presentation/coaching.error-mapper';
import { createMyDietPlanRouter, createStaffDietPlanRouter } from './presentation/coaching.routes';

export interface CoachingCrossFeaturePorts {
  readonly liveGymAdmin: LiveGymAdminPort;
  readonly liveTrainerProfile: LiveTrainerProfilePort;
  readonly entitlement: CoachingEntitlementPort;
  readonly gymLocalClock: GymLocalClock;
  readonly logPrescribedFood: LogPrescribedFood;
  readonly prescribedDiary: PrescribedDiaryQueries;
  readonly seedCatalog: SeedCatalogPort;
}

export function composeCoachingFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  ports: CoachingCrossFeaturePorts,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const plans = new SupabaseDietPlanRepository(dataClient);
  const planQueries = new SupabaseDietPlanQueries(dataClient);
  const assignPolicy = new DietAssignPolicy(ports.liveGymAdmin, ports.liveTrainerProfile);
  const clientPolicy = new DietClientPolicy();

  const controller = new CoachingController(
    new AssignDietPlanUseCase(
      assignPolicy,
      ports.entitlement,
      ports.seedCatalog,
      plans,
      ports.gymLocalClock,
      clock,
      ids,
    ),
    new GetStaffDietPlanUseCase(assignPolicy, ports.entitlement, planQueries),
    new GetMyDietPlanUseCase(
      clientPolicy,
      ports.entitlement,
      planQueries,
      ports.prescribedDiary,
      ports.gymLocalClock,
      clock,
    ),
    new CompleteDietItemUseCase(
      clientPolicy,
      ports.entitlement,
      plans,
      ports.logPrescribedFood,
      ports.gymLocalClock,
      clock,
    ),
    new UncompleteDietItemUseCase(
      clientPolicy,
      ports.entitlement,
      plans,
      ports.logPrescribedFood,
      ports.gymLocalClock,
      clock,
    ),
  );

  return {
    staffDietPlanRouter: createStaffDietPlanRouter(controller, authenticate),
    myDietPlanRouter: createMyDietPlanRouter(controller, authenticate),
    errorMapper: mapCoachingError,
  };
}
