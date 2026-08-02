import { Router, type RequestHandler } from 'express';

/**
 * Feature routers are mounted here by composition-root.
 */
export function createRouter(authRouter: RequestHandler): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  router.use('/auth', authRouter);

  return router;
}
