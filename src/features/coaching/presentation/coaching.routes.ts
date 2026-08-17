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
  router.get('/my-diet-plan', controller.myPlan);
  router.post('/my-diet-plan/items/:itemId/complete', controller.complete);
  router.delete('/my-diet-plan/items/:itemId/complete', controller.uncomplete);
  return router;
}
