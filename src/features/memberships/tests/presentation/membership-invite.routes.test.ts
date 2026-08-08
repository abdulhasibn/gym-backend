import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { AcceptMembershipInviteUseCase } from '../../application/accept-membership-invite.use-case';
import { CreateMembershipInviteUseCase } from '../../application/create-membership-invite.use-case';
import { CreateMembershipPlanUseCase } from '../../application/create-membership-plan.use-case';
import { GetMyDataGrantsUseCase } from '../../application/get-my-data-grants.use-case';
import { ListMembershipInvitesUseCase } from '../../application/list-membership-invites.use-case';
import { ListMyMembershipInviteInboxUseCase } from '../../application/list-my-membership-invite-inbox.use-case';
import { PlanAdminPolicy } from '../../application/plan-admin.policy';
import { RevokeMembershipInviteUseCase } from '../../application/revoke-membership-invite.use-case';
import { UpdateMyDataGrantsUseCase } from '../../application/update-my-data-grants.use-case';
import { DurationDays } from '../../domain/duration-days.value-object';
import { InviteeEmail } from '../../domain/invitee-email.value-object';
import { InviteeName } from '../../domain/invitee-name.value-object';
import { MembershipInvite } from '../../domain/membership-invite.entity';
import { toMembershipInviteId } from '../../domain/membership-invite-id';
import { toMembershipPlanId } from '../../domain/membership-plan-id';
import { PlanName } from '../../domain/plan-name.value-object';
import { PlanPrice } from '../../domain/plan-price.value-object';
import { MembershipInviteController } from '../../presentation/membership-invite.controller';
import {
  createMembershipInviteClientRouter,
  createMembershipInviteRouter,
  createMyDataGrantsRouter,
} from '../../presentation/membership-invite.routes';
import { mapMembershipPlanError } from '../../presentation/membership-plan.error-mapper';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryClientMembershipStore } from '../fakes/in-memory-client-membership.repository';
import { InMemoryClientUserLookup } from '../fakes/in-memory-client-user-lookup';
import { InMemoryDataGrantStore } from '../fakes/in-memory-data-grant.store';
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

const clientUserId = '22222222-2222-4222-8222-222222222222';

async function createTestApp(roleCode: 'ADMIN' | 'TRAINER' | 'CLIENT' = 'ADMIN') {
  const plans = new InMemoryMembershipPlanStore();
  const invites = new InMemoryMembershipInviteStore();
  const clientUsers = new InMemoryClientUserLookup();
  const memberships = new InMemoryClientMembershipStore();
  const grants = new InMemoryDataGrantStore();
  const admins = new FixedLiveGymAdmin();
  // Always seed so plan fixture can be created; request actor role still gates invites.
  admins.seed(toUserId(adminUserId), toGymOrgId(gymOrgId));
  const policy = new PlanAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-08T00:00:00.000Z'));
  invites.setNow(clock.now());
  invites.seedGymProfile({
    id: toGymOrgId(gymOrgId),
    name: 'North Star',
    address: null,
    contactPhone: null,
    contactEmail: null,
    logoUrl: null,
    timezone: 'Asia/Kolkata',
  });
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
    new ListMyMembershipInviteInboxUseCase(invites),
    new AcceptMembershipInviteUseCase(invites, clock),
    new GetMyDataGrantsUseCase(grants),
    new UpdateMyDataGrantsUseCase(memberships, grants, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    const isClient = roleCode === 'CLIENT';
    setAuthenticatedActor(req, {
      userId: toUserId(isClient ? clientUserId : adminUserId),
      roleCode,
      lane: isClient ? 'CLIENT' : 'STAFF',
      email: isClient ? 'client@example.com' : 'admin@example.com',
      staffCode: isClient ? null : 'STF-ADMIN',
    });
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    `/gym-orgs/:gymOrgId/membership-invites`,
    createMembershipInviteRouter(controller, authenticate),
  );
  app.use('/membership-invites', createMembershipInviteClientRouter(controller, authenticate));
  app.use(`/gym-orgs/:gymOrgId/my-data-grants`, createMyDataGrantsRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapMembershipPlanError]));

  return { app, basePlanId: base.id, clientUsers, memberships, grants, invites };
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

  it('client inbox accepts invite and manages grants', async () => {
    const { app, invites, memberships, grants } = await createTestApp('CLIENT');

    const invite = MembershipInvite.create({
      id: toMembershipInviteId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      gymOrgId: toGymOrgId(gymOrgId),
      invitedEmail: InviteeEmail.create('client@example.com'),
      invitedUserId: toUserId(clientUserId),
      inviteeName: InviteeName.create('Alex'),
      inviteePhone: null,
      basePlanId: toMembershipPlanId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
      expiresAt: new Date('2026-08-22T00:00:00.000Z'),
      createdBy: toUserId(adminUserId),
      now: new Date('2026-08-08T00:00:00.000Z'),
    });
    await invites.save(invite);

    const inbox = await supertest(app).get('/membership-invites/inbox').expect(200);
    expect(inbox.body.membershipInvites.total).toBe(1);

    const accepted = await supertest(app)
      .post(`/membership-invites/${invite.id}/accept`)
      .send({
        optionalProfileAttributes: ['GENDER'],
        optionalClassGrants: ['PROGRESS'],
      })
      .expect(200);

    expect(accepted.body.membershipInvite.status).toBe('ACCEPTED');
    expect(accepted.body.grants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'GENDER']),
    );

    memberships.seedActive(toUserId(clientUserId), toGymOrgId(gymOrgId));
    grants.seedActiveMembership(toUserId(clientUserId), toGymOrgId(gymOrgId));
    grants.seedRequiredGrants(toUserId(clientUserId), toGymOrgId(gymOrgId));

    const updated = await supertest(app)
      .put(`/gym-orgs/${gymOrgId}/my-data-grants`)
      .send({
        optionalProfileAttributes: ['MEDICAL_NOTES'],
        optionalClassGrants: ['CALORIES'],
      })
      .expect(200);

    expect(updated.body.dataGrants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'MEDICAL_NOTES']),
    );
    expect(updated.body.dataGrants.classGrants).toContain('CALORIES');
  });
});
