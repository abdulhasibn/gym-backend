import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { AssignDietPlanUseCase } from '../../application/assign-diet-plan.use-case';
import { CompleteDietItemUseCase } from '../../application/complete-diet-item.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DietClientPolicy } from '../../application/diet-client.policy';
import { GetMyDietPlanUseCase } from '../../application/get-my-diet-plan.use-case';
import { GetStaffDietPlanUseCase } from '../../application/get-staff-diet-plan.use-case';
import { UncompleteDietItemUseCase } from '../../application/uncomplete-diet-item.use-case';
import type { CoachingEntitlementPort } from '../../domain/coaching-entitlement.port';
import type { DietPlan } from '../../domain/diet-plan.entity';
import type { DietPlanQueries } from '../../domain/diet-plan.queries';
import type { DietPlanRepository } from '../../domain/diet-plan.repository';
import type { GymLocalClock } from '../../domain/gym-local-clock.port';
import type { LogPrescribedFood } from '../../domain/log-prescribed-food.port';
import type { PrescribedDiaryQueries } from '../../domain/prescribed-diary.queries';
import type { SeedCatalogPort } from '../../domain/seed-catalog.port';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { CoachingController } from '../../presentation/coaching.controller';
import { mapCoachingError } from '../../presentation/coaching.error-mapper';
import { createStaffDietPlanRouter } from '../../presentation/coaching.routes';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

const gymOrgId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const clientUserId = '11111111-1111-4111-8111-111111111111';
const trainerUserId = '22222222-2222-4222-8222-222222222222';
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const foodId = 'f00d0000-0000-4000-8000-000000000001';
const servingId = 'f00d5e04-0000-4000-8000-000000010003';

const trainer: AuthenticatedActor = {
  userId: toUserId(trainerUserId),
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

function createApp(actor: AuthenticatedActor) {
  const plans: DietPlanRepository = {
    async findActiveByClientAtGym(): Promise<DietPlan | null> {
      return null;
    },
    async assign() {},
  };
  const queries: DietPlanQueries = {
    async findActiveByClientAtGym() {
      return null;
    },
  };
  const entitlement: CoachingEntitlementPort = {
    async findActiveMembership() {
      return { assignedTrainerId: trainerProfileId };
    },
    async hasInDateCoachingAddon() {
      return true;
    },
  };
  const catalog: SeedCatalogPort = {
    async hasLiveSeedServing() {
      return true;
    },
  };
  const diary: PrescribedDiaryQueries = {
    async findLoggedItemIds() {
      return [];
    },
  };
  const gymClock: GymLocalClock = {
    async today() {
      return CalendarDate.create('2026-08-17');
    },
  };
  const logPrescribed: LogPrescribedFood = {
    async log() {},
    async unlog() {},
  };
  const policy = new DietAssignPolicy(
    { isLiveAdmin: async () => false },
    {
      findLiveProfileId: async () => trainerProfileId,
    },
  );
  const controller = new CoachingController(
    new AssignDietPlanUseCase(
      policy,
      entitlement,
      catalog,
      plans,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
      { generate: () => crypto.randomUUID() },
    ),
    new GetStaffDietPlanUseCase(policy, entitlement, queries),
    new GetMyDietPlanUseCase(new DietClientPolicy(), entitlement, queries, diary, gymClock, {
      now: () => new Date('2026-08-17T10:00:00.000Z'),
    }),
    new CompleteDietItemUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      logPrescribed,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
    ),
    new UncompleteDietItemUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      logPrescribed,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
    ),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, actor);
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/gym-orgs/:gymOrgId/clients/:clientUserId',
    createStaffDietPlanRouter(controller, authenticate),
  );
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapCoachingError]));
  return app;
}

describe('POST diet-plans', () => {
  it('rejects a validation error when meals are missing', async () => {
    const response = await request(createApp(trainer))
      .post(`/gym-orgs/${gymOrgId}/clients/${clientUserId}/diet-plans`)
      .send({ title: 'Cut' });
    expect(response.status).toBe(422);
  });

  it('assigns a catalog diet plan', async () => {
    const response = await request(createApp(trainer))
      .post(`/gym-orgs/${toGymOrgId(gymOrgId)}/clients/${clientUserId}/diet-plans`)
      .send({
        title: 'Cut week',
        meals: [
          {
            mealSlot: 'BREAKFAST',
            items: [{ foodItemId: foodId, servingId, quantity: 2 }],
          },
        ],
      });
    expect(response.status).toBe(201);
    expect(response.body.dietPlan.title).toBe('Cut week');
  });
});
