import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { CreateMembershipInviteUseCase } from '../../application/create-membership-invite.use-case';
import { CreateMembershipPlanUseCase } from '../../application/create-membership-plan.use-case';
import { ListMembershipInvitesUseCase } from '../../application/list-membership-invites.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { RevokeMembershipInviteUseCase } from '../../application/revoke-membership-invite.use-case';
import { DurationDays } from '../../domain/duration-days.value-object';
import { PlanName } from '../../domain/plan-name.value-object';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { MembershipInviteController } from '../../presentation/membership-invite.controller';
import { createMembershipInviteRouter } from '../../presentation/membership-invite.routes';
import { mapMembershipPlanError } from '../../presentation/membership-plan.error-mapper';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryClientUserLookup } from '../fakes/in-memory-client-user-lookup';
import { InMemoryMembershipInviteStore } from '../fakes/in-memory-membership-invite.repository';
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

async function createTestApp(roleCode: 'ADMIN' | 'TRAINER' | 'CLIENT' = 'ADMIN') {
  const plans = new InMemoryMembershipPlanStore();
  const invites = new InMemoryMembershipInviteStore();
  const clientUsers = new InMemoryClientUserLookup();
  const admins = new FixedLiveGymAdmin();
  // Always seed so plan fixture can be created; request actor role still gates invites.
  admins.seed(toUserId(adminUserId), toGymOrgId(gymOrgId));
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-08T00:00:00.000Z'));
  invites.setNow(clock.now());
  let n = 0;
  const ids = {
    generate: () => {
      n += 1;
      return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
    },
  };

  const createPlan = new CreateMembershipPlanUseCase(plans, policy, clock, ids);
  const base = await createPlan.execute(
    {
      userId: toUserId(adminUserId),
      roleCode: 'ADMIN',
      lane: 'STAFF',
      email: 'admin@example.com',
      staffCode: 'STF-ADMIN',
    },
    {
      gymOrgId: toGymOrgId(gymOrgId),
      name: PlanName.create('Monthly'),
      kind: 'BASE',
      capability: null,
      durationDays: DurationDays.create(30),
      price: PlanPrice.create(999),
    },
  );

  const controller = new MembershipInviteController(
    new CreateMembershipInviteUseCase(policy, invites, plans, clientUsers, clock, ids),
    new ListMembershipInvitesUseCase(policy, invites),
    new RevokeMembershipInviteUseCase(policy, invites, clock),
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
  app.use(
    `/gym-orgs/:gymOrgId/membership-invites`,
    createMembershipInviteRouter(controller, authenticate),
  );
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapMembershipPlanError]));

  return { app, basePlanId: base.id, clientUsers };
}

describe('membership invite routes', () => {
  it('creates, lists, and revokes', async () => {
    const { app, basePlanId } = await createTestApp();

    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .send({
        inviteeName: 'Alex',
        invitedEmail: 'alex@example.com',
        basePlanId,
        basePaymentStatus: 'unpaid',
      })
      .expect(201);

    expect(create.body.membershipInvite).toMatchObject({
      inviteeName: 'Alex',
      invitedEmail: 'alex@example.com',
      basePlanId,
      status: 'PENDING',
    });

    const list = await supertest(app).get(`/gym-orgs/${gymOrgId}/membership-invites`).expect(200);
    expect(list.body.membershipInvites.total).toBe(1);

    const inviteId = create.body.membershipInvite.id as string;
    const revoke = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites/${inviteId}/revoke`)
      .expect(200);
    expect(revoke.body.membershipInvite.status).toBe('REVOKED');
  });

  it('returns 403 for non-admin', async () => {
    const { app, basePlanId } = await createTestApp('TRAINER');
    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .send({
        inviteeName: 'Alex',
        invitedEmail: 'alex@example.com',
        basePlanId,
        basePaymentStatus: 'unpaid',
      })
      .expect(403);
  });

  it('returns 422 for staff invitee email', async () => {
    const { app, basePlanId, clientUsers } = await createTestApp();
    clientUsers.seed('staff@example.com', {
      userId: toUserId('33333333-3333-4333-8333-333333333333'),
      roleCode: 'TRAINER',
      lane: 'STAFF',
    });

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .send({
        inviteeName: 'Staff',
        invitedEmail: 'staff@example.com',
        basePlanId,
        basePaymentStatus: 'unpaid',
      })
      .expect(422);
  });

  it('returns 422 for wrong-kind base plan', async () => {
    const { app } = await createTestApp();
    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .send({
        inviteeName: 'Alex',
        invitedEmail: 'alex@example.com',
        basePlanId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        basePaymentStatus: 'unpaid',
      })
      .expect(422);
  });
});
