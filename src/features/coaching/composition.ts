import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { AssignDietPlanFromTemplateUseCase } from './application/assign-diet-plan-from-template.use-case';
import { AssignDietPlanUseCase } from './application/assign-diet-plan.use-case';
import { CompleteDietItemUseCase } from './application/complete-diet-item.use-case';
import { CompleteScheduleExerciseUseCase } from './application/complete-schedule-exercise.use-case';
import { CreateDietPlanTemplateUseCase } from './application/create-diet-plan-template.use-case';
import { CreateWorkoutPlanTemplateUseCase } from './application/create-workout-plan-template.use-case';
import { DeleteDietPlanTemplateUseCase } from './application/delete-diet-plan-template.use-case';
import { DeleteWorkoutPlanTemplateUseCase } from './application/delete-workout-plan-template.use-case';
import { DietAssignPolicy } from './application/diet-assign.policy';
import { DietClientPolicy } from './application/diet-client.policy';
import { DietTemplatePolicy } from './application/diet-template.policy';
import { DuplicateDietPlanTemplateUseCase } from './application/duplicate-diet-plan-template.use-case';
import { DuplicateWorkoutPlanTemplateUseCase } from './application/duplicate-workout-plan-template.use-case';
import { GetDietPlanTemplateUseCase } from './application/get-diet-plan-template.use-case';
import { GetMyDietPlanUseCase } from './application/get-my-diet-plan.use-case';
import { GetMyWorkoutScheduleUseCase } from './application/get-my-workout-schedule.use-case';
import { GetMyWorkoutStreakUseCase } from './application/get-my-workout-streak.use-case';
import { GetStaffDietPlanUseCase } from './application/get-staff-diet-plan.use-case';
import { GetStaffWorkoutScheduleUseCase } from './application/get-staff-workout-schedule.use-case';
import { GetStaffWorkoutStreakUseCase } from './application/get-staff-workout-streak.use-case';
import { GetWorkoutPlanTemplateUseCase } from './application/get-workout-plan-template.use-case';
import { ListDietPlanTemplatesUseCase } from './application/list-diet-plan-templates.use-case';
import { ListWorkoutPlanTemplatesUseCase } from './application/list-workout-plan-templates.use-case';
import { SearchExercisesUseCase } from './application/search-exercises.use-case';
import { UncompleteDietItemUseCase } from './application/uncomplete-diet-item.use-case';
import { UncompleteScheduleExerciseUseCase } from './application/uncomplete-schedule-exercise.use-case';
import { UpdateDietPlanTemplateUseCase } from './application/update-diet-plan-template.use-case';
import { UpdateWorkoutPlanTemplateUseCase } from './application/update-workout-plan-template.use-case';
import { UpsertWorkoutScheduleUseCase } from './application/upsert-workout-schedule.use-case';
import { WorkoutTemplatePolicy } from './application/workout-template.policy';
import type { CoachingEntitlementPort } from './domain/coaching-entitlement.port';
import type { ClientDataGrantGate } from './domain/client-data-grant.gate';
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
import { SupabaseWorkoutPlanTemplateQueries } from './infrastructure/supabase-workout-plan-template.queries';
import { SupabaseWorkoutPlanTemplateRepository } from './infrastructure/supabase-workout-plan-template.repository';
import { SupabaseWorkoutScheduleCompletionQueries } from './infrastructure/supabase-workout-schedule-completion.queries';
import { SupabaseWorkoutScheduleCompletionRepository } from './infrastructure/supabase-workout-schedule-completion.repository';
import { SupabaseWorkoutScheduleQueries } from './infrastructure/supabase-workout-schedule.queries';
import { SupabaseWorkoutScheduleRepository } from './infrastructure/supabase-workout-schedule.repository';
import { CoachingController } from './presentation/coaching.controller';
import { mapCoachingError } from './presentation/coaching.error-mapper';
import {
  createExercisesRouter,
  createMyDietPlanRouter,
  createMyWorkoutScheduleRouter,
  createMyWorkoutStreakRouter,
  createStaffDietPlanRouter,
  createStaffDietTemplateRouter,
  createStaffWorkoutScheduleRouter,
  createStaffWorkoutTemplateRouter,
} from './presentation/coaching.routes';

export interface CoachingCrossFeaturePorts {
  readonly liveGymAdmin: LiveGymAdminPort;
  readonly liveTrainerProfile: LiveTrainerProfilePort;
  readonly entitlement: CoachingEntitlementPort;
  readonly gymLocalClock: GymLocalClock;
  readonly logPrescribedFood: LogPrescribedFood;
  readonly prescribedDiary: PrescribedDiaryQueries;
  readonly seedCatalog: SeedCatalogPort;
  readonly dataGrantGate: ClientDataGrantGate;
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
  const workoutSchedule = new SupabaseWorkoutScheduleRepository(dataClient);
  const workoutScheduleQueries = new SupabaseWorkoutScheduleQueries(dataClient);
  const scheduleCompletions = new SupabaseWorkoutScheduleCompletionRepository(dataClient);
  const scheduleCompletionQueries = new SupabaseWorkoutScheduleCompletionQueries(dataClient);
  const workoutTemplates = new SupabaseWorkoutPlanTemplateRepository(dataClient);
  const workoutTemplateQueries = new SupabaseWorkoutPlanTemplateQueries(dataClient);
  const assignPolicy = new DietAssignPolicy(ports.liveGymAdmin, ports.liveTrainerProfile);
  const templatePolicy = new DietTemplatePolicy(assignPolicy);
  const workoutTemplatePolicy = new WorkoutTemplatePolicy(assignPolicy);
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
    new UpsertWorkoutScheduleUseCase(
      assignPolicy,
      ports.entitlement,
      workoutTemplates,
      workoutSchedule,
      ports.gymLocalClock,
      clock,
      ids,
    ),
    new GetStaffWorkoutScheduleUseCase(
      assignPolicy,
      ports.entitlement,
      workoutScheduleQueries,
      scheduleCompletionQueries,
      ports.dataGrantGate,
    ),
    new GetMyWorkoutScheduleUseCase(
      clientPolicy,
      ports.entitlement,
      workoutScheduleQueries,
      scheduleCompletionQueries,
      ports.gymLocalClock,
      clock,
    ),
    new CompleteScheduleExerciseUseCase(
      clientPolicy,
      ports.entitlement,
      workoutSchedule,
      scheduleCompletions,
      ports.gymLocalClock,
      clock,
    ),
    new UncompleteScheduleExerciseUseCase(
      clientPolicy,
      ports.entitlement,
      workoutSchedule,
      scheduleCompletions,
      ports.gymLocalClock,
      clock,
    ),
    new CreateWorkoutPlanTemplateUseCase(
      workoutTemplatePolicy,
      exerciseCatalog,
      workoutTemplates,
      clock,
      ids,
    ),
    new ListWorkoutPlanTemplatesUseCase(workoutTemplatePolicy, workoutTemplateQueries),
    new GetWorkoutPlanTemplateUseCase(workoutTemplatePolicy, workoutTemplateQueries),
    new DuplicateWorkoutPlanTemplateUseCase(workoutTemplatePolicy, workoutTemplates, clock, ids),
    new UpdateWorkoutPlanTemplateUseCase(
      workoutTemplatePolicy,
      exerciseCatalog,
      workoutTemplates,
      clock,
      ids,
    ),
    new DeleteWorkoutPlanTemplateUseCase(workoutTemplatePolicy, workoutTemplates, clock),
    new GetMyWorkoutStreakUseCase(
      clientPolicy,
      ports.entitlement,
      workoutScheduleQueries,
      scheduleCompletionQueries,
      ports.gymLocalClock,
      clock,
    ),
    new GetStaffWorkoutStreakUseCase(
      assignPolicy,
      ports.entitlement,
      workoutScheduleQueries,
      scheduleCompletionQueries,
      ports.dataGrantGate,
      ports.gymLocalClock,
      clock,
    ),
  );

  return {
    staffDietPlanRouter: createStaffDietPlanRouter(controller, authenticate),
    staffDietTemplateRouter: createStaffDietTemplateRouter(controller, authenticate),
    myDietPlanRouter: createMyDietPlanRouter(controller, authenticate),
    exercisesRouter: createExercisesRouter(controller, authenticate),
    staffWorkoutScheduleRouter: createStaffWorkoutScheduleRouter(controller, authenticate),
    myWorkoutScheduleRouter: createMyWorkoutScheduleRouter(controller, authenticate),
    myWorkoutStreakRouter: createMyWorkoutStreakRouter(controller, authenticate),
    staffWorkoutTemplateRouter: createStaffWorkoutTemplateRouter(controller, authenticate),
    errorMapper: mapCoachingError,
  };
}
