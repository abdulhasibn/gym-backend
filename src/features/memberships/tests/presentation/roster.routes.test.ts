import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { AssignTrainerUseCase } from '../../application/assign-trainer.use-case';
import { ListGymMembersUseCase } from '../../application/list-gym-members.use-case';
import { ListMyAssignedMembersUseCase } from '../../application/list-my-assigned-members.use-case';
import { OffboardClientUseCase } from '../../application/offboard-client.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { SetCheckInBlockedUseCase } from '../../application/set-check-in-blocked.use-case';
import { TrainerRosterPolicy } from '../../application/trainer-roster.policy';
import { CalendarDate } from '../../domain/calendar-date.value-object';
import { DurationDays } from '../../domain/duration-days.value-object';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { Subscription } from '../../domain/subscription.entity';
import { toSubscriptionId } from '../../domain/subscription-id';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { mapMembershipPlanError } from '../../presentation/membership-plan.error-mapper';
import { RosterController } from '../../presentation/roster.controller';
import {
  createMembersRouter,
  createMyAssignedMembersRouter,
} from '../../presentation/roster.routes';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { FixedLiveTrainerProfile } from '../fakes/fixed-live-trainer-profile';
import { InMemoryClientMembershipStore } from '../fakes/in-memory-client-membership.repository';
import { InMemoryOffboardMembership } from '../fakes/in-memory-offboard-membership';
import { InMemorySubscriptionStore } from '../fakes/in-memory-subscription.repository';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

const gymOrgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const adminUserId = '11111111-1111-4111-8111-111111111111';
const trainerUserId = '33333333-3333-4333-8333-333333333333';
const clientUserId = '22222222-2222-4222-8222-222222222222';
const trainerProfileId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const now = new Date('2026-08-09T00:00:00.000Z');

async function createTestApp(roleCode: 'ADMIN' | 'TRAINER' = 'ADMIN') {
  const memberships = new InMemoryClientMembershipStore();
  const subscriptions = new InMemorySubscriptionStore();
  const admins = new FixedLiveGymAdmin();
  const trainers = new FixedLiveTrainerProfile();
  admins.seed(toUserId(adminUserId), toGymOrgId(gymOrgId));
  trainers.seed(
    toUserId(trainerUserId),
    toGymOrgId(gymOrgId),
    toTrainerProfileId(trainerProfileId),
  );
  trainers.seed(toUserId(adminUserId), toGymOrgId(gymOrgId), toTrainerProfileId(trainerProfileId));

  const membership = memberships.seedActive(toUserId(clientUserId), toGymOrgId(gymOrgId));
  subscriptions.seed(
    Subscription.reconstitute({
      id: toSubscriptionId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      clientMembershipId: membership.id,
      gymOrgId: toGymOrgId(gymOrgId),
      planId: toMembershipPlanId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      kind: 'ADDON',
      capability: 'TRAINER_COACHING',
      priceAmount: PlanPrice.create(500),
      durationDays: DurationDays.create(30),
      startDate: CalendarDate.create('2026-08-01'),
      endDate: CalendarDate.create('2026-08-30'),
      startSource: 'ADMIN_ATTACH',
      paymentStatus: 'unpaid',
      amountPaid: PlanPrice.create(0),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }),
  );

  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(now);
  const controller = new RosterController(
    new ListGymMembersUseCase(policy, memberships),
    new ListMyAssignedMembersUseCase(new TrainerRosterPolicy(trainers), memberships),
    new AssignTrainerUseCase(policy, memberships, subscriptions, trainers, clock),
    new OffboardClientUseCase(
      policy,
      memberships,
      new InMemoryOffboardMembership(memberships),
      clock,
    ),
    new SetCheckInBlockedUseCase(policy, memberships, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, {
      userId: toUserId(roleCode === 'ADMIN' ? adminUserId : trainerUserId),
      roleCode,
      lane: 'STAFF',
      email: roleCode === 'ADMIN' ? 'admin@example.com' : 'trainer@example.com',
      staffCode: roleCode === 'ADMIN' ? 'STF-ADMIN' : 'STF-TRAIN',
    });
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(`/gym-orgs/:gymOrgId/members`, createMembersRouter(controller, authenticate));
  app.use(
    `/gym-orgs/:gymOrgId/my-assigned-members`,
    createMyAssignedMembersRouter(controller, authenticate),
  );
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapMembershipPlanError]));

  return { app, membershipId: membership.id };
}

describe('roster routes', () => {
  it('lists members for admin', async () => {
    const { app } = await createTestApp('ADMIN');
    const response = await supertest(app).get(`/gym-orgs/${gymOrgId}/members`);
    expect(response.status).toBe(200);
    expect(response.body.members).toHaveLength(1);
  });

  it('assigns trainer, blocks check-in, then offboards', async () => {
    const { app, membershipId } = await createTestApp('ADMIN');

    const assigned = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/members/${membershipId}/assign-trainer`)
      .send({ trainerProfileId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.membership.assignedTrainerId).toBe(trainerProfileId);

    const blocked = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/members/${membershipId}/check-in-block`)
      .send({ blocked: true });
    expect(blocked.status).toBe(200);
    expect(blocked.body.membership.checkInBlocked).toBe(true);

    const offboarded = await supertest(app).post(
      `/gym-orgs/${gymOrgId}/members/${membershipId}/offboard`,
    );
    expect(offboarded.status).toBe(200);
    expect(offboarded.body.membership.status).toBe('INACTIVE');
  });

  it('forbids admin roster for trainer role', async () => {
    const { app } = await createTestApp('TRAINER');
    const response = await supertest(app).get(`/gym-orgs/${gymOrgId}/members`);
    expect(response.status).toBe(403);
  });
});
