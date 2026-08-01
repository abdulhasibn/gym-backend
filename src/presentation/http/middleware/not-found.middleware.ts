import type { NextFunction, Request, Response } from 'express';

import { NotFoundError } from '../../../domain/errors/not-found.error';

/**
 * Mounted after every route. Any request that reaches this point matched no
 * route, so it is forwarded to the error handler as a NotFoundError rather
 * than answered here directly (one place decides HTTP mapping — see
 * error-handler.middleware.ts).
 */
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`No route for ${req.method} ${req.path}`));
}
