import type { SupabaseClient } from '@supabase/supabase-js';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { JSON_BODY_LIMIT } from '../config/constants';
import type { AppConfig } from '../config/environment';
import { createLogger } from '../infrastructure/logging/logger';
import { createRequestLoggerMiddleware } from '../infrastructure/logging/request-logger.middleware';
import { createSupabaseInfraClient } from '../infrastructure/supabase/supabase-client';
import { createErrorHandlerMiddleware } from '../presentation/http/errors/error-handler.middleware';
import { notFoundMiddleware } from '../presentation/http/middleware/not-found.middleware';
import type { Logger } from '../shared/logging/logger.port';
import { createRouter } from './routes';

export interface AppDependencies {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly supabaseClient: SupabaseClient;
  readonly app: Express;
}

/**
 * The composition root (architecture.md §11). This is the only module allowed
 * to construct concrete implementations from every layer and wire them
 * together — it is called only by app/http-server.ts and by tests that need
 * a real app instance.
 *
 * Each feature will export its own `composition.ts` exposing a
 * `register(...)`/`compose...(...)` function; this function will call those
 * once the first feature module exists. It must not construct
 * feature-internal collaborators itself.
 */
export function composeApp(config: AppConfig): AppDependencies {
  const logger = createLogger(config);
  const supabaseClient = createSupabaseInfraClient(config);

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(createRequestLoggerMiddleware(logger));

  app.use(createRouter());

  app.use(notFoundMiddleware);
  app.use(createErrorHandlerMiddleware(logger));

  return { config, logger, supabaseClient, app };
}
