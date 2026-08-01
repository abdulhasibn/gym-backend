import { Router } from 'express';

/**
 * Only route today is the health check. Feature routers are mounted here
 * once the first feature module exists (composition-root calls each
 * feature's composition unit and mounts its router — architecture.md §11).
 */
export function createRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
