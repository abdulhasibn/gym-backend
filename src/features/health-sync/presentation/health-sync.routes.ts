import { Router, type RequestHandler } from 'express';

import type { HealthSyncController } from './health-sync.controller';

export function createMeWearableRouter(
  controller: HealthSyncController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/wearable-connections', controller.listConnections);
  router.post('/wearable-connections', controller.connect);
  router.delete('/wearable-connections/:provider', controller.disconnect);
  router.post('/wearable-metrics/sync', controller.syncMetricsHandler);
  router.get('/wearable-metrics', controller.listMyMetricsHandler);
  return router;
}

export function createStaffClientWearableRouter(
  controller: HealthSyncController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/wearable-metrics', controller.staffListMetrics);
  return router;
}
