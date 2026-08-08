import { Router, type RequestHandler } from 'express';

import type { MembershipInviteController } from './membership-invite.controller';

/** Admin gym-scoped invite routes — mount at `/gym-orgs/:gymOrgId/membership-invites`. */
export function createMembershipInviteRouter(
  controller: MembershipInviteController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.post('/:inviteId/revoke', controller.revoke);

  return router;
}

/** Client self-service invite routes — mount at `/membership-invites`. */
export function createMembershipInviteClientRouter(
  controller: MembershipInviteController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);

  router.get('/inbox', controller.listInbox);
  router.post('/:inviteId/accept', controller.accept);

  return router;
}

/** Client data-grant routes — mount at `/gym-orgs/:gymOrgId/my-data-grants`. */
export function createMyDataGrantsRouter(
  controller: MembershipInviteController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);

  router.get('/', controller.getMyDataGrants);
  router.put('/', controller.updateMyDataGrants);

  return router;
}
