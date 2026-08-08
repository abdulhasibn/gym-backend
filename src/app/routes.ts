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

  return router;
}
