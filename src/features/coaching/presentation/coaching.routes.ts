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

export function createStaffDietTemplateRouter(
  controller: CoachingController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.post('/diet-plan-templates', controller.createTemplate);
  router.get('/diet-plan-templates', controller.listTemplates);
  router.get('/diet-plan-templates/:templateId', controller.getTemplate);
  router.post('/diet-plan-templates/:templateId/duplicate', controller.duplicateTemplate);
  router.patch('/diet-plan-templates/:templateId', controller.updateTemplate);
  router.delete('/diet-plan-templates/:templateId', controller.deleteTemplate);
  return router;
}
