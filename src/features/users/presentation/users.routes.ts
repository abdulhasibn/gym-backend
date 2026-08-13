import { Router, type RequestHandler } from 'express';

import type { UsersController } from './users.controller';

export function createMeUsersRouter(
  controller: UsersController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/profile', controller.getProfile);
  router.patch('/profile', controller.patchProfile);
  router.get('/progress-logs', controller.listProgress);
  router.put('/progress-logs', controller.upsertProgress);
  return router;
}

export function createStaffClientUsersRouter(
  controller: UsersController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/profile', controller.staffGetProfile);
  router.get('/progress-logs', controller.staffListProgress);
  return router;
}
