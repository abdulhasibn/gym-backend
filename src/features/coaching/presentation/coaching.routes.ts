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
