import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { CreateMembershipPlanUseCase } from '../../application/create-membership-plan.use-case';
import { GetMembershipPlanUseCase } from '../../application/get-membership-plan.use-case';
import { ListMembershipPlansUseCase } from '../../application/list-membership-plans.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { SoftDeleteMembershipPlanUseCase } from '../../application/soft-delete-membership-plan.use-case';
import { UpdateMembershipPlanUseCase } from '../../application/update-membership-plan.use-case';
import { MembershipPlanController } from '../../presentation/membership-plan.controller';
import { mapMembershipPlanError } from '../../presentation/membership-plan.error-mapper';
import { createMembershipPlanRouter } from '../../presentation/membership-plan.routes';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryMembershipPlanStore } from '../fakes/in-memory-membership-plan.repository';

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

function createTestApp(roleCode: 'ADMIN' | 'TRAINER' | 'CLIENT' = 'ADMIN') {
  const store = new InMemoryMembershipPlanStore();
  const admins = new FixedLiveGymAdmin();
  if (roleCode === 'ADMIN') {
    admins.seed(toUserId(adminUserId), toGymOrgId(gymOrgId));
  }
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-08T00:00:00.000Z'));
  let n = 0;

  const controller = new MembershipPlanController(
    new CreateMembershipPlanUseCase(store, policy, clock, {
      generate: () => {
        n += 1;
        return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
      },
    }),
    new ListMembershipPlansUseCase(store, policy),
    new GetMembershipPlanUseCase(store, policy),
    new UpdateMembershipPlanUseCase(store, policy, clock),
    new SoftDeleteMembershipPlanUseCase(store, policy, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, {
      userId: toUserId(adminUserId),
      roleCode,
      lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
      email: 'admin@example.com',
      staffCode: 'STF-ADMIN',
    });
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(`/gym-orgs/:gymOrgId/plans`, createMembershipPlanRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapMembershipPlanError]));

  return { app };
}

describe('membership plan routes', () => {
  it('creates, lists, patches, and soft-deletes', async () => {
    const { app } = createTestApp();

    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .send({
        name: 'Monthly',
        kind: 'BASE',
        durationDays: 30,
        price: 999,
      })
      .expect(201);

    expect(create.body.plan).toMatchObject({
      name: 'Monthly',
      kind: 'BASE',
      capability: null,
      durationDays: 30,
      price: 999,
      active: true,
    });

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .send({
        name: 'PT Addon',
        kind: 'ADDON',
        capability: 'TRAINER_COACHING',
        durationDays: 30,
        price: 1500,
      })
      .expect(201);

    const list = await supertest(app).get(`/gym-orgs/${gymOrgId}/plans`).expect(200);
    expect(list.body.plans.total).toBe(2);

    const planId = create.body.plan.id as string;

    await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/plans/${planId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.plan.name).toBe('Monthly');
      });

    await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/plans/${planId}`)
      .send({
        name: 'Monthly Plus',
        durationDays: 45,
        price: 1200,
        active: false,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.plan.active).toBe(false);
        expect(res.body.plan.kind).toBe('BASE');
      });

    const activeList = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/plans?active=true`)
      .expect(200);
    expect(activeList.body.plans.total).toBe(1);

    await supertest(app).delete(`/gym-orgs/${gymOrgId}/plans/${planId}`).expect(204);
    await supertest(app).get(`/gym-orgs/${gymOrgId}/plans/${planId}`).expect(404);
  });

  it('rejects BASE with capability and ADDON without', async () => {
    const { app } = createTestApp();

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .send({
        name: 'Bad',
        kind: 'BASE',
        capability: 'TRAINER_COACHING',
        durationDays: 30,
        price: 1,
      })
      .expect(422);

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .send({
        name: 'Bad Addon',
        kind: 'ADDON',
        durationDays: 30,
        price: 1,
      })
      .expect(422);
  });

  it('returns 403 for trainer', async () => {
    const { app } = createTestApp('TRAINER');

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .send({
        name: 'Monthly',
        kind: 'BASE',
        durationDays: 30,
        price: 999,
      })
      .expect(403);
  });
});
