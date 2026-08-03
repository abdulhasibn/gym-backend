import { Router, type RequestHandler } from 'express';

import type { GymOrgController } from './gym-org.controller';

export function createGymOrgRouter(
  controller: GymOrgController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post('/', controller.create);
  router.get('/', controller.listMine);

  return router;
}
