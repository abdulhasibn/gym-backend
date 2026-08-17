import { Router, type RequestHandler } from 'express';

import type { NutritionController } from './nutrition.controller';

export function createFoodsRouter(
  controller: NutritionController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/search', controller.search);
  return router;
}

export function createMeCalorieLogRouter(
  controller: NutritionController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/calorie-logs', controller.getMyLog);
  router.post('/calorie-logs/items', controller.logExtra);
  router.delete('/calorie-logs/items/:itemId', controller.unlogItem);
  return router;
}

export function createStaffClientCalorieLogRouter(
  controller: NutritionController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/calorie-logs', controller.staffGetLog);
  return router;
}
