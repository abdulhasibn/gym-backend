import { Router, type RequestHandler } from 'express';

import type { MembershipInviteController } from './membership-invite.controller';

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
