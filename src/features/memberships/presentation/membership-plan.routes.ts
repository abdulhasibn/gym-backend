import { Router, type RequestHandler } from 'express';

import type { MembershipPlanController } from './membership-plan.controller';

export function createMembershipPlanRouter(
  controller: MembershipPlanController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:planId', controller.getOne);
  router.patch('/:planId', controller.update);
  router.delete('/:planId', controller.softDelete);

  return router;
}
