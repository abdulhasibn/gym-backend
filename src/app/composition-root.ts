import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { JSON_BODY_LIMIT } from '../config/constants';
import type { AppConfig } from '../config/environment';
import { composeAuthFeature } from '../features/auth/composition';
import { composeGymOrgFeature } from '../features/gym-orgs/composition';
import { composeLeadsFeature } from '../features/leads/composition';
import { composeMembershipsFeature } from '../features/memberships/composition';
import { toTrainerProfileId } from '../features/memberships/domain/trainer-profile-id';
import { createLogger } from '../infrastructure/logging/logger';
import { createRequestLoggerMiddleware } from '../infrastructure/logging/request-logger.middleware';
import type { Database } from '../infrastructure/supabase/database.types';
import {
  createSupabaseAuthClient,
  createSupabaseInfraClient,
} from '../infrastructure/supabase/supabase-client';
import { createErrorHandlerMiddleware } from '../presentation/http/errors/error-handler.middleware';
import { notFoundMiddleware } from '../presentation/http/middleware/not-found.middleware';
import type { Logger } from '../shared/logging/logger.port';
import { createRouter } from './routes';

export interface AppDependencies {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly supabaseClient: import('@supabase/supabase-js').SupabaseClient<Database>;
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
  const authClient = createSupabaseAuthClient(config);
  const authFeature = composeAuthFeature(authClient, supabaseClient, {
    supabaseUrl: config.supabase.url,
    enableGoogleCallbackHelper: config.nodeEnv !== 'production',
  });
  const gymOrgFeature = composeGymOrgFeature(supabaseClient, authFeature.authenticate);
  const leadsFeature = composeLeadsFeature(supabaseClient, authFeature.authenticate, {
    isLiveAdmin: gymOrgFeature.isLiveAdmin,
  });
  const membershipsFeature = composeMembershipsFeature(
    supabaseClient,
    authFeature.authenticate,
    { isLiveAdmin: gymOrgFeature.isLiveAdmin },
    {
      findLiveProfileId: async (userId, gymOrgId) => {
        const id = await gymOrgFeature.findLiveTrainerProfileId(userId, gymOrgId);
        return id === null ? null : toTrainerProfileId(id);
      },
      isLiveAtGym: (trainerProfileId, gymOrgId) =>
        gymOrgFeature.isLiveTrainerProfile(trainerProfileId, gymOrgId),
    },
  );

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(createRequestLoggerMiddleware(logger));

  app.use(
    createRouter(
      authFeature.router,
      gymOrgFeature.router,
      leadsFeature.router,
      membershipsFeature.plansRouter,
      membershipsFeature.invitesRouter,
      membershipsFeature.inviteClientRouter,
      membershipsFeature.myDataGrantsRouter,
      membershipsFeature.clientSubscriptionsRouter,
      membershipsFeature.subscriptionsAdminRouter,
      membershipsFeature.mySubscriptionsRouter,
      membershipsFeature.membersRouter,
      membershipsFeature.myAssignedMembersRouter,
    ),
  );

  app.use(notFoundMiddleware);
  app.use(
    createErrorHandlerMiddleware(logger, [
      authFeature.errorMapper,
      gymOrgFeature.errorMapper,
      leadsFeature.errorMapper,
      membershipsFeature.errorMapper,
    ]),
  );

  return { config, logger, supabaseClient, app };
}
