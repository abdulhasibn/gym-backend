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

  router.get('/staff-invites/inbox', controller.listInviteInbox);
  router.post('/staff-invites/:inviteId/accept', controller.acceptInvite);
  router.post('/staff-invites/:inviteId/revoke', controller.revokeInvite);

  router.get('/:gymOrgId', controller.getOne);
  router.patch('/:gymOrgId', controller.update);
  router.post('/:gymOrgId/staff-invites', controller.createInvite);
  router.get('/:gymOrgId/staff-invites', controller.listInvitesForGym);

  return router;
}

/** Mount at `/gym-orgs/:gymOrgId/trainers` so coaching routers cannot swallow the path. */
export function createGymTrainersRouter(
  controller: GymOrgController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/', controller.listTrainers);
  return router;
}
