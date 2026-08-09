import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { ListClientSubscriptionsUseCase } from '../../application/list-client-subscriptions.use-case';
import { ListMySubscriptionsUseCase } from '../../application/list-my-subscriptions.use-case';
import { OverrideSubscriptionStartUseCase } from '../../application/override-subscription-start.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { UpdateSubscriptionPaymentUseCase } from '../../application/update-subscription-payment.use-case';
import { DurationDays } from '../../domain/duration-days.value-object';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { Subscription } from '../../domain/subscription.entity';
import { toSubscriptionId } from '../../domain/subscription-id';
import { SubscriptionController } from '../../presentation/subscription.controller';
import {
  createClientSubscriptionsRouter,
  createMySubscriptionsRouter,
  createSubscriptionAdminRouter,
} from '../../presentation/subscription.routes';
import { mapMembershipPlanError } from '../../presentation/membership-plan.error-mapper';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryClientMembershipStore } from '../fakes/in-memory-client-membership.repository';
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
const clientUserId = '22222222-2222-4222-8222-222222222222';
const subscriptionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const now = new Date('2026-08-09T00:00:00.000Z');

async function createTestApp(roleCode: 'ADMIN' | 'CLIENT' = 'ADMIN') {
  const memberships = new InMemoryClientMembershipStore();
  const subscriptions = new InMemorySubscriptionStore();
  const admins = new FixedLiveGymAdmin();
  admins.seed(toUserId(adminUserId), toGymOrgId(gymOrgId));
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(now);

  const membership = memberships.seedActive(toUserId(clientUserId), toGymOrgId(gymOrgId));
  subscriptions.seed(
    Subscription.reconstitute({
      id: toSubscriptionId(subscriptionId),
      clientMembershipId: membership.id,
      gymOrgId: toGymOrgId(gymOrgId),
      planId: toMembershipPlanId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      kind: 'BASE',
      capability: null,
      priceAmount: PlanPrice.create(1000),
      durationDays: DurationDays.create(30),
      startDate: null,
      endDate: null,
      startSource: null,
      paymentStatus: 'unpaid',
      amountPaid: PlanPrice.create(0),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }),
    toUserId(clientUserId),
  );

  const controller = new SubscriptionController(
    new ListClientSubscriptionsUseCase(policy, subscriptions),
    new ListMySubscriptionsUseCase(subscriptions),
    new UpdateSubscriptionPaymentUseCase(policy, subscriptions, memberships, clock),
    new OverrideSubscriptionStartUseCase(policy, subscriptions, memberships, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, {
      userId: toUserId(roleCode === 'ADMIN' ? adminUserId : clientUserId),
      roleCode,
      lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
      email: roleCode === 'ADMIN' ? 'admin@example.com' : 'client@example.com',
      staffCode: roleCode === 'ADMIN' ? 'STF-ADMIN' : null,
    });
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    `/gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions`,
    createClientSubscriptionsRouter(controller, authenticate),
  );
  app.use(
    `/gym-orgs/:gymOrgId/subscriptions`,
    createSubscriptionAdminRouter(controller, authenticate),
  );
  app.use(
    `/gym-orgs/:gymOrgId/my-subscriptions`,
    createMySubscriptionsRouter(controller, authenticate),
  );
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapMembershipPlanError]));
  return app;
}

describe('subscription routes', () => {
  it('lists client subscriptions for admin', async () => {
    const app = await createTestApp('ADMIN');
    const res = await supertest(app).get(
      `/gym-orgs/${gymOrgId}/clients/${clientUserId}/subscriptions`,
    );
    expect(res.status).toBe(200);
    expect(res.body.subscriptions).toHaveLength(1);
    expect(res.body.subscriptions[0].id).toBe(subscriptionId);
  });

  it('updates payment and overrides start', async () => {
    const app = await createTestApp('ADMIN');

    const paid = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/subscriptions/${subscriptionId}/payment`)
      .send({ paymentStatus: 'paid' });
    expect(paid.status).toBe(200);
    expect(paid.body.subscription.paymentStatus).toBe('paid');
    expect(paid.body.subscription.amountPaid).toBe(1000);

    const started = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/subscriptions/${subscriptionId}/start-override`)
      .send({ startDate: '2026-08-01' });
    expect(started.status).toBe(200);
    expect(started.body.subscription.startDate).toBe('2026-08-01');
    expect(started.body.subscription.endDate).toBe('2026-08-30');
    expect(started.body.subscription.startSource).toBe('ADMIN_OVERRIDE');
  });

  it('rejects invalid payment body and start date', async () => {
    const app = await createTestApp('ADMIN');

    const partial = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/subscriptions/${subscriptionId}/payment`)
      .send({ paymentStatus: 'partial' });
    expect(partial.status).toBe(422);

    const badDate = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/subscriptions/${subscriptionId}/start-override`)
      .send({ startDate: 'not-a-date' });
    expect(badDate.status).toBe(422);
  });

  it('lets client list my-subscriptions and forbids admin on that route', async () => {
    const clientApp = await createTestApp('CLIENT');
    const mine = await supertest(clientApp).get(`/gym-orgs/${gymOrgId}/my-subscriptions`);
    expect(mine.status).toBe(200);
    expect(mine.body.subscriptions).toHaveLength(1);

    const adminApp = await createTestApp('ADMIN');
    const forbidden = await supertest(adminApp).get(`/gym-orgs/${gymOrgId}/my-subscriptions`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('SUBSCRIPTION_FORBIDDEN');
  });

  it('returns 403 when client tries admin payment update', async () => {
    const app = await createTestApp('CLIENT');
    const res = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/subscriptions/${subscriptionId}/payment`)
      .send({ paymentStatus: 'paid' });
    expect(res.status).toBe(403);
  });
});
