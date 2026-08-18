import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { JSON_BODY_LIMIT } from '../config/constants';
import type { AppConfig } from '../config/environment';
import { NotFoundError } from '../domain/errors/not-found.error';
import type { CalendarDate } from '../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../domain/shared/gym-org-id';
import type { UserId } from '../domain/shared/user-id';
import { toTrainerProfileId as toCoachingTrainerProfileId } from '../features/coaching/domain/trainer-profile-id';
import { composeCoachingFeature } from '../features/coaching/composition';
import { composeAttendanceFeature } from '../features/attendance/composition';
import { composeNutritionFeature } from '../features/nutrition/composition';
import type { BaseSubscriptionStarter } from '../features/attendance/domain/base-subscription-starter.port';
import type {
  CheckInMembershipGate,
  CheckInMembershipSnapshot,
} from '../features/attendance/domain/check-in-membership.gate';
import { GymOrgLocalClock } from '../features/attendance/infrastructure/gym-org-local-clock.adapter';
import { composeAuthFeature } from '../features/auth/composition';
import { composeGymOrgFeature } from '../features/gym-orgs/composition';
import { composeLeadsFeature } from '../features/leads/composition';
import { composeMembershipsFeature } from '../features/memberships/composition';
import { toSubscriptionId } from '../features/memberships/domain/subscription-id';
import { toTrainerProfileId } from '../features/memberships/domain/trainer-profile-id';
import { composeUsersFeature } from '../features/users/composition';
import { createLogger } from '../infrastructure/logging/logger';
import { createRequestLoggerMiddleware } from '../infrastructure/logging/request-logger.middleware';
import type { Database } from '../infrastructure/supabase/database.types';
import {
  createSupabaseAuthClient,
  createSupabaseInfraClient,
} from '../infrastructure/supabase/supabase-client';
import { createErrorHandlerMiddleware } from '../presentation/http/errors/error-handler.middleware';
import { createServerTimingMiddleware } from '../presentation/http/middleware/server-timing.middleware';
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
    jwtSecret: config.supabase.jwtSecret,
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

  const checkInGate: CheckInMembershipGate = {
    async loadActive(
      clientUserId: UserId,
      gymOrgId: GymOrgId,
    ): Promise<CheckInMembershipSnapshot | null> {
      const membership = await membershipsFeature.clientMemberships.findActiveByClientAtGym(
        clientUserId,
        gymOrgId,
      );
      if (membership === null) {
        return null;
      }
      const base = await membershipsFeature.subscriptions.findBaseForMembership(
        gymOrgId,
        membership.id,
      );
      return {
        membershipId: membership.id,
        checkInBlocked: membership.checkInBlocked,
        base:
          base === null
            ? null
            : {
                subscriptionId: base.id,
                startDate: base.startDate,
                endDate: base.endDate,
              },
      };
    },
  };

  const baseStarter: BaseSubscriptionStarter = {
    async startFromFirstAttendance(
      gymOrgId: GymOrgId,
      subscriptionId: string,
      today: CalendarDate,
      now: Date,
    ): Promise<void> {
      const subscription = await membershipsFeature.subscriptions.findById(
        gymOrgId,
        toSubscriptionId(subscriptionId),
      );
      if (subscription === null) {
        throw new NotFoundError('BASE subscription not found');
      }
      subscription.startFromFirstAttendance(today, now);
      await membershipsFeature.subscriptions.save(subscription);
    },
  };

  const gymLocalClock = new GymOrgLocalClock({ findTimezone: gymOrgFeature.findTimezone });

  const attendanceFeature = composeAttendanceFeature(supabaseClient, authFeature.authenticate, {
    liveGymAdmin: { isLiveAdmin: gymOrgFeature.isLiveAdmin },
    liveTrainer: {
      isLiveTrainer: async (userId, gymOrgId) =>
        (await gymOrgFeature.findLiveTrainerProfileId(userId, gymOrgId)) !== null,
    },
    checkInGate,
    baseStarter,
    gymLocalClock,
  });

  const nutritionFeature = composeNutritionFeature(supabaseClient, authFeature.authenticate, {
    liveGymAdmin: { isLiveAdmin: gymOrgFeature.isLiveAdmin },
    liveTrainer: {
      isLiveTrainer: async (userId, gymOrgId) =>
        (await gymOrgFeature.findLiveTrainerProfileId(userId, gymOrgId)) !== null,
    },
    dataGrantGate: {
      async loadForActiveMembership(clientUserId, gymOrgId) {
        const snapshot = await membershipsFeature.dataGrantQueries.listForActiveMembership(
          clientUserId,
          gymOrgId,
        );
        if (snapshot === null) {
          return null;
        }
        return {
          classGrants: [...snapshot.classGrants],
        };
      },
    },
  });

  const coachingFeature = composeCoachingFeature(supabaseClient, authFeature.authenticate, {
    liveGymAdmin: { isLiveAdmin: gymOrgFeature.isLiveAdmin },
    liveTrainerProfile: {
      async findLiveProfileId(userId, gymOrgId) {
        const id = await gymOrgFeature.findLiveTrainerProfileId(userId, gymOrgId);
        return id === null ? null : toCoachingTrainerProfileId(id);
      },
    },
    entitlement: {
      async findActiveMembership(clientUserId, gymOrgId) {
        const membership = await membershipsFeature.clientMemberships.findActiveByClientAtGym(
          clientUserId,
          gymOrgId,
        );
        if (membership === null) {
          return null;
        }
        return { assignedTrainerId: membership.assignedTrainerId };
      },
      async hasInDateCoachingAddon(clientUserId, gymOrgId, today) {
        const membership = await membershipsFeature.clientMemberships.findActiveByClientAtGym(
          clientUserId,
          gymOrgId,
        );
        if (membership === null) {
          return false;
        }
        const addon = await membershipsFeature.subscriptions.findInDateCoachingAddon(
          gymOrgId,
          membership.id,
          today,
        );
        return addon !== null;
      },
    },
    gymLocalClock: {
      today: (gymOrgId, now) => gymLocalClock.today(gymOrgId, now),
    },
    logPrescribedFood: nutritionFeature.logPrescribedFood,
    prescribedDiary: {
      findLoggedItemIds: (clientUserId, logDate, dietPlanMealItemIds) =>
        nutritionFeature.calorieLogQueries.findLoggedPrescribedItemIds(
          clientUserId,
          logDate,
          dietPlanMealItemIds,
        ),
    },
    seedCatalog: {
      async hasLiveSeedServing(foodItemId, servingId) {
        const serving = await nutritionFeature.catalog.findLiveSeedServing(foodItemId, servingId);
        return serving !== null;
      },
    },
  });

  const usersFeature = composeUsersFeature(supabaseClient, authFeature.authenticate, {
    liveGymAdmin: { isLiveAdmin: gymOrgFeature.isLiveAdmin },
    liveTrainer: {
      isLiveTrainer: async (userId, gymOrgId) =>
        (await gymOrgFeature.findLiveTrainerProfileId(userId, gymOrgId)) !== null,
    },
    dataGrantGate: {
      async loadForActiveMembership(clientUserId, gymOrgId) {
        const snapshot = await membershipsFeature.dataGrantQueries.listForActiveMembership(
          clientUserId,
          gymOrgId,
        );
        if (snapshot === null) {
          return null;
        }
        return {
          profileAttributes: [...snapshot.profileAttributes],
          classGrants: [...snapshot.classGrants],
        };
      },
    },
  });

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(createServerTimingMiddleware());
  app.use(createRequestLoggerMiddleware(logger));

  app.use(
    createRouter(
      authFeature.router,
      gymOrgFeature.router,
      gymOrgFeature.trainersRouter,
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
      attendanceFeature.router,
      attendanceFeature.myAttendancesRouter,
      usersFeature.meRouter,
      usersFeature.staffClientRouter,
      nutritionFeature.foodsRouter,
      nutritionFeature.meCalorieLogRouter,
      nutritionFeature.staffClientCalorieLogRouter,
      coachingFeature.staffDietPlanRouter,
      coachingFeature.staffDietTemplateRouter,
      coachingFeature.myDietPlanRouter,
      coachingFeature.exercisesRouter,
      coachingFeature.staffWorkoutPlanRouter,
      coachingFeature.myWorkoutPlanRouter,
    ),
  );

  app.use(notFoundMiddleware);
  app.use(
    createErrorHandlerMiddleware(logger, [
      authFeature.errorMapper,
      gymOrgFeature.errorMapper,
      leadsFeature.errorMapper,
      membershipsFeature.errorMapper,
      attendanceFeature.errorMapper,
      usersFeature.errorMapper,
      nutritionFeature.errorMapper,
      coachingFeature.errorMapper,
    ]),
  );

  return { config, logger, supabaseClient, app };
}
