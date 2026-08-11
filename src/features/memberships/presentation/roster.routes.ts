import { Router, type RequestHandler } from 'express';

import type { RosterController } from './roster.controller';

/** Admin gym roster — mount at `/gym-orgs/:gymOrgId/members`. */
export function createMembersRouter(
  controller: RosterController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);
  router.get('/', controller.listMembers);
  router.post('/:membershipId/assign-trainer', controller.assignTrainerHandler);
  router.post('/:membershipId/offboard', controller.offboardHandler);
  router.patch('/:membershipId/check-in-block', controller.checkInBlockHandler);

  return router;
}

/** Trainer (or Admin-as-Trainer) assigned roster — mount at `/gym-orgs/:gymOrgId/my-assigned-members`. */
export function createMyAssignedMembersRouter(
  controller: RosterController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);
  router.get('/', controller.listAssigned);

  return router;
}
