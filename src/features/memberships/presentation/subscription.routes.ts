import { Router, type RequestHandler } from 'express';

import type { SubscriptionController } from './subscription.controller';

/**
 * Admin client subscriptions list — mount at
 * `/gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions`.
 */
export function createClientSubscriptionsRouter(
  controller: SubscriptionController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);
  router.get('/', controller.listForClient);

  return router;
}

/**
 * Admin subscription mutations — mount at `/gym-orgs/:gymOrgId/subscriptions`.
 */
export function createSubscriptionAdminRouter(
  controller: SubscriptionController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);
  router.patch('/:subscriptionId/payment', controller.updatePaymentHandler);
  router.post('/:subscriptionId/start-override', controller.overrideStartHandler);

  return router;
}

/** Client self subscriptions — mount at `/gym-orgs/:gymOrgId/my-subscriptions`. */
export function createMySubscriptionsRouter(
  controller: SubscriptionController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);
  router.get('/', controller.listMine);

  return router;
}
