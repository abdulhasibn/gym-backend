import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import pinoHttp from 'pino-http';

import { CORRELATION_ID_HEADER } from '../../config/constants';
import type { Logger } from '../../shared/logging/logger.port';

/**
 * Wraps `pino-http`, which is why this lives in infrastructure rather than
 * presentation/http/middleware — it necessarily needs the concrete Pino
 * logger, not the `Logger` port. It still returns a plain Express
 * `RequestHandler`, so the composition root (the only caller) does not need
 * to know about Pino either; it just mounts the returned middleware.
 *
 * The `logger` parameter is always the value produced by
 * `infrastructure/logging/logger.ts#createLogger`, which is a concrete Pino
 * instance widened to the `Logger` port at its boundary. The cast back below
 * is safe because both sides of this call are within the same infrastructure
 * module and always share that concrete instance.
 */
export function createRequestLoggerMiddleware(logger: Logger): RequestHandler {
  const httpLogger = pinoHttp({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pino-http requires the concrete pino.Logger type; see comment above.
    logger: logger as any,
    genReqId: (req) => {
      const inbound = req.headers[CORRELATION_ID_HEADER];
      return (Array.isArray(inbound) ? inbound[0] : inbound) ?? randomUUID();
    },
  });

  return (req, res, next) => {
    httpLogger(req, res, () => {
      res.setHeader(CORRELATION_ID_HEADER, String(req.id));
      next();
    });
  };
}
