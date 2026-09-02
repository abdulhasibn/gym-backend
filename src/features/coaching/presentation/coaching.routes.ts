import { Router, type RequestHandler } from 'express';

import type { CoachingController } from './coaching.controller';

export function createStaffDietPlanRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.post('/diet-plans', controller.assign);
  router.get('/diet-plans', controller.staffGet);
  return router;
}

export function createMyDietPlanRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/', controller.myPlan);
  router.post('/items/:itemId/complete', controller.complete);
  router.delete('/items/:itemId/complete', controller.uncomplete);
  return router;
}

/** Mount at `/gym-orgs/:gymOrgId/diet-plan-templates`. */
export function createStaffDietTemplateRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.post('/', controller.createTemplate);
  router.get('/', controller.listTemplates);
  router.get('/:templateId', controller.getTemplate);
  router.post('/:templateId/duplicate', controller.duplicateTemplate);
  router.patch('/:templateId', controller.updateTemplate);
  router.delete('/:templateId', controller.deleteTemplate);
  return router;
}

/** Mount at `/gym-orgs/:gymOrgId/workout-plan-templates`. */
export function createStaffWorkoutTemplateRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.post('/', controller.createWorkoutTemplate);
  router.get('/', controller.listWorkoutTemplates);
  router.get('/:templateId', controller.getWorkoutTemplate);
  router.post('/:templateId/duplicate', controller.duplicateWorkoutTemplate);
  router.patch('/:templateId', controller.updateWorkoutTemplate);
  router.delete('/:templateId', controller.deleteWorkoutTemplate);
  return router;
}

export function createExercisesRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/search', controller.search);
  return router;
}

/** Mount at `/gym-orgs/:gymOrgId/clients/:clientUserId`. */
export function createStaffWorkoutScheduleRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.put('/workout-schedule', controller.upsertSchedule);
  router.get('/workout-schedule', controller.staffGetSchedule);
  router.get('/workout-streak', controller.staffGetStreak);
  return router;
}

/** Mount at `/gym-orgs/:gymOrgId/my-workout-schedule`. */
export function createMyWorkoutScheduleRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/', controller.mySchedule);
  router.post('/items/:itemId/complete', controller.completeSchedule);
  router.delete('/items/:itemId/complete', controller.uncompleteSchedule);
  return router;
}

/** Mount at `/gym-orgs/:gymOrgId/my-workout-streak`. */
export function createMyWorkoutStreakRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/', controller.myStreak);
  return router;
}
