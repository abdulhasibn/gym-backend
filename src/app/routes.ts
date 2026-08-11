import { Router, type RequestHandler } from 'express';

/**
 * Feature routers are mounted here by composition-root.
 */
export function createRouter(
  authRouter: RequestHandler,
  gymOrgRouter: RequestHandler,
  leadsRouter: RequestHandler,
  membershipPlansRouter: RequestHandler,
  membershipInvitesRouter: RequestHandler,
  membershipInviteClientRouter: RequestHandler,
  myDataGrantsRouter: RequestHandler,
  clientSubscriptionsRouter: RequestHandler,
  subscriptionsAdminRouter: RequestHandler,
  mySubscriptionsRouter: RequestHandler,
  membersRouter: RequestHandler,
  myAssignedMembersRouter: RequestHandler,
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  router.use('/auth', authRouter);
  router.use('/gym-orgs', gymOrgRouter);
  router.use('/gym-orgs/:gymOrgId/leads', leadsRouter);
  router.use('/gym-orgs/:gymOrgId/plans', membershipPlansRouter);
  router.use('/gym-orgs/:gymOrgId/membership-invites', membershipInvitesRouter);
  router.use('/gym-orgs/:gymOrgId/my-data-grants', myDataGrantsRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions', clientSubscriptionsRouter);
  router.use('/gym-orgs/:gymOrgId/subscriptions', subscriptionsAdminRouter);
  router.use('/gym-orgs/:gymOrgId/my-subscriptions', mySubscriptionsRouter);
  router.use('/gym-orgs/:gymOrgId/members', membersRouter);
  router.use('/gym-orgs/:gymOrgId/my-assigned-members', myAssignedMembersRouter);
  router.use('/membership-invites', membershipInviteClientRouter);

  return router;
}
