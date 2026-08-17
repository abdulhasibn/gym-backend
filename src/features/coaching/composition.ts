import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { AssignDietPlanFromTemplateUseCase } from './application/assign-diet-plan-from-template.use-case';
import { AssignDietPlanUseCase } from './application/assign-diet-plan.use-case';
import { AssignWorkoutPlanUseCase } from './application/assign-workout-plan.use-case';
import { CompleteDietItemUseCase } from './application/complete-diet-item.use-case';
import { CompleteWorkoutExerciseUseCase } from './application/complete-workout-exercise.use-case';
import { CreateDietPlanTemplateUseCase } from './application/create-diet-plan-template.use-case';
import { DeleteDietPlanTemplateUseCase } from './application/delete-diet-plan-template.use-case';
import { DietAssignPolicy } from './application/diet-assign.policy';
import { DietClientPolicy } from './application/diet-client.policy';
import { DietTemplatePolicy } from './application/diet-template.policy';
import { DuplicateDietPlanTemplateUseCase } from './application/duplicate-diet-plan-template.use-case';
import { GetDietPlanTemplateUseCase } from './application/get-diet-plan-template.use-case';
import { GetMyDietPlanUseCase } from './application/get-my-diet-plan.use-case';
import { GetMyWorkoutPlanUseCase } from './application/get-my-workout-plan.use-case';
import { GetStaffDietPlanUseCase } from './application/get-staff-diet-plan.use-case';
import { GetStaffWorkoutPlanUseCase } from './application/get-staff-workout-plan.use-case';
import { ListDietPlanTemplatesUseCase } from './application/list-diet-plan-templates.use-case';
import { SearchExercisesUseCase } from './application/search-exercises.use-case';
import { UncompleteDietItemUseCase } from './application/uncomplete-diet-item.use-case';
import { UncompleteWorkoutExerciseUseCase } from './application/uncomplete-workout-exercise.use-case';
import { UpdateDietPlanTemplateUseCase } from './application/update-diet-plan-template.use-case';
import type { CoachingEntitlementPort } from './domain/coaching-entitlement.port';
import type { GymLocalClock } from './domain/gym-local-clock.port';
import type { LiveGymAdminPort, LiveTrainerProfilePort } from './domain/live-staff.port';
import type { LogPrescribedFood } from './domain/log-prescribed-food.port';
import type { PrescribedDiaryQueries } from './domain/prescribed-diary.queries';
import type { SeedCatalogPort } from './domain/seed-catalog.port';
import { SupabaseDietPlanQueries } from './infrastructure/supabase-diet-plan.queries';
import { SupabaseDietPlanRepository } from './infrastructure/supabase-diet-plan.repository';
import { SupabaseDietPlanTemplateQueries } from './infrastructure/supabase-diet-plan-template.queries';
import { SupabaseDietPlanTemplateRepository } from './infrastructure/supabase-diet-plan-template.repository';
import { SupabaseExerciseCatalogQueries } from './infrastructure/supabase-exercise-catalog.queries';
import { SupabaseExerciseCatalogRepository } from './infrastructure/supabase-exercise-catalog.repository';
import { SupabaseWorkoutCompletionQueries } from './infrastructure/supabase-workout-completion.queries';
import { SupabaseWorkoutCompletionRepository } from './infrastructure/supabase-workout-completion.repository';
import { SupabaseWorkoutPlanQueries } from './infrastructure/supabase-workout-plan.queries';
import { SupabaseWorkoutPlanRepository } from './infrastructure/supabase-workout-plan.repository';
import { CoachingController } from './presentation/coaching.controller';
import { mapCoachingError } from './presentation/coaching.error-mapper';
import {
  createExercisesRouter,
  createMyDietPlanRouter,
  createMyWorkoutPlanRouter,
  createStaffDietPlanRouter,
  createStaffDietTemplateRouter,
  createStaffWorkoutPlanRouter,
} from './presentation/coaching.routes';

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
  const templates = new SupabaseDietPlanTemplateRepository(dataClient);
  const templateQueries = new SupabaseDietPlanTemplateQueries(dataClient);
  const exerciseCatalog = new SupabaseExerciseCatalogRepository(dataClient);
  const exerciseQueries = new SupabaseExerciseCatalogQueries(dataClient);
  const workoutPlans = new SupabaseWorkoutPlanRepository(dataClient);
  const workoutPlanQueries = new SupabaseWorkoutPlanQueries(dataClient);
  const workoutCompletions = new SupabaseWorkoutCompletionRepository(dataClient);
  const workoutCompletionQueries = new SupabaseWorkoutCompletionQueries(dataClient);
  const assignPolicy = new DietAssignPolicy(ports.liveGymAdmin, ports.liveTrainerProfile);
  const templatePolicy = new DietTemplatePolicy(assignPolicy);
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
    new AssignDietPlanFromTemplateUseCase(
      assignPolicy,
      templatePolicy,
      ports.entitlement,
      ports.seedCatalog,
      templates,
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
    new CreateDietPlanTemplateUseCase(templatePolicy, ports.seedCatalog, templates, clock, ids),
    new ListDietPlanTemplatesUseCase(templatePolicy, templateQueries),
    new GetDietPlanTemplateUseCase(templatePolicy, templateQueries),
    new DuplicateDietPlanTemplateUseCase(templatePolicy, templates, clock, ids),
    new UpdateDietPlanTemplateUseCase(templatePolicy, ports.seedCatalog, templates, clock, ids),
    new DeleteDietPlanTemplateUseCase(templatePolicy, templates, clock),
    new SearchExercisesUseCase(exerciseQueries),
    new AssignWorkoutPlanUseCase(
      assignPolicy,
      ports.entitlement,
      exerciseCatalog,
      workoutPlans,
      ports.gymLocalClock,
      clock,
      ids,
    ),
    new GetStaffWorkoutPlanUseCase(assignPolicy, ports.entitlement, workoutPlanQueries),
    new GetMyWorkoutPlanUseCase(
      clientPolicy,
      ports.entitlement,
      workoutPlanQueries,
      workoutCompletionQueries,
      ports.gymLocalClock,
      clock,
    ),
    new CompleteWorkoutExerciseUseCase(
      clientPolicy,
      ports.entitlement,
      workoutPlans,
      workoutCompletions,
      ports.gymLocalClock,
      clock,
    ),
    new UncompleteWorkoutExerciseUseCase(
      clientPolicy,
      ports.entitlement,
      workoutPlans,
      workoutCompletions,
      ports.gymLocalClock,
      clock,
    ),
  );

  return {
    staffDietPlanRouter: createStaffDietPlanRouter(controller, authenticate),
    staffDietTemplateRouter: createStaffDietTemplateRouter(controller, authenticate),
    myDietPlanRouter: createMyDietPlanRouter(controller, authenticate),
    exercisesRouter: createExercisesRouter(controller, authenticate),
    staffWorkoutPlanRouter: createStaffWorkoutPlanRouter(controller, authenticate),
    myWorkoutPlanRouter: createMyWorkoutPlanRouter(controller, authenticate),
    errorMapper: mapCoachingError,
  };
}
