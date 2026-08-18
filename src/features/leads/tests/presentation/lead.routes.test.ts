import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { ChangeLeadStatusUseCase } from '../../application/change-lead-status.use-case';
import { ConvertLeadUseCase } from '../../application/convert-lead.use-case';
import { CreateLeadUseCase } from '../../application/create-lead.use-case';
import { GetLeadUseCase } from '../../application/get-lead.use-case';
import { LeadAdminPolicy } from '../../application/lead-admin.policy';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import type {
  CreateMembershipInviteFromLead,
  CreateMembershipInviteFromLeadCommand,
  CreatedMembershipInviteFromLead,
} from '../../domain/create-membership-invite.port';
import { ListDueFollowUpsUseCase } from '../../application/list-due-follow-ups.use-case';
import { ListLeadsUseCase } from '../../application/list-leads.use-case';
import { SoftDeleteLeadUseCase } from '../../application/soft-delete-lead.use-case';
import { UpdateLeadUseCase } from '../../application/update-lead.use-case';
import { LeadController } from '../../presentation/lead.controller';
import { mapLeadError } from '../../presentation/lead.error-mapper';
import { createLeadRouter } from '../../presentation/lead.routes';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryLeadStore } from '../fakes/in-memory-lead.repository';

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
const basePlanId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

class FakeCreateMembershipInvite implements CreateMembershipInviteFromLead {
  async execute(
    _actor: AuthenticatedActor,
    command: CreateMembershipInviteFromLeadCommand,
  ): Promise<CreatedMembershipInviteFromLead> {
    const now = '2026-08-07T00:00:00.000Z';
    return {
      id: 'invite-1',
      gymOrgId: command.gymOrgId,
      invitedEmail: command.invitedEmail,
      invitedUserId: null,
      inviteeName: command.inviteeName,
      inviteePhone: command.inviteePhone,
      basePlanId: command.basePlanId,
      basePaymentStatus: command.basePaymentStatus,
      addonPlanId: command.addonPlanId,
      addonPaymentStatus: command.addonPaymentStatus,
      status: 'PENDING',
      expiresAt: null,
      createdBy: adminUserId,
      acceptedAt: null,
      acceptedMembershipId: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}

function createTestApp(roleCode: 'ADMIN' | 'TRAINER' | 'CLIENT' = 'ADMIN') {
  const store = new InMemoryLeadStore();
  const admins = new FixedLiveGymAdmin();
  if (roleCode === 'ADMIN') {
    admins.seed(toUserId(adminUserId), toGymOrgId(gymOrgId));
  }
  const policy = new LeadAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-07T00:00:00.000Z'));
  let n = 0;

  const controller = new LeadController(
    new CreateLeadUseCase(store, policy, clock, {
      generate: () => {
        n += 1;
        return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
      },
    }),
    new ListLeadsUseCase(store, policy),
    new GetLeadUseCase(store, policy),
    new UpdateLeadUseCase(store, policy, clock),
    new ChangeLeadStatusUseCase(store, policy, clock),
    new ConvertLeadUseCase(store, policy, new FakeCreateMembershipInvite(), clock),
    new SoftDeleteLeadUseCase(store, policy, clock),
    new ListDueFollowUpsUseCase(store, policy),
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
  app.use(`/gym-orgs/:gymOrgId/leads`, createLeadRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapLeadError]));

  return { app };
}

describe('lead routes', () => {
  it('creates, lists, patches status, and soft-deletes', async () => {
    const { app } = createTestApp();

    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'Walk-in', phone: '9876543210', source: 'desk' })
      .expect(201);

    expect(create.body.lead).toMatchObject({
      name: 'Walk-in',
      phone: '9876543210',
      email: null,
      status: 'NEW',
      convertedMembershipInviteId: null,
    });
    expect(create.body.warnings).toEqual([]);

    const list = await supertest(app).get(`/gym-orgs/${gymOrgId}/leads`).expect(200);
    expect(list.body.leads.total).toBe(1);

    const leadId = create.body.lead.id as string;

    await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/leads/${leadId}/status`)
      .send({ status: 'CONTACTED' })
      .expect(200)
      .expect((res) => {
        expect(res.body.lead.status).toBe('CONTACTED');
      });

    await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/leads/${leadId}`)
      .send({
        name: 'Walk-in',
        phone: '9876543210',
        followUpDate: '2026-08-07',
      })
      .expect(200);

    const due = await supertest(app).get(`/gym-orgs/${gymOrgId}/leads/due-follow-ups`).expect(200);
    expect(due.body.leads.total).toBe(1);

    await supertest(app).delete(`/gym-orgs/${gymOrgId}/leads/${leadId}`).expect(204);
    await supertest(app).get(`/gym-orgs/${gymOrgId}/leads/${leadId}`).expect(404);
  });

  it('returns soft warning on duplicate open phone', async () => {
    const { app } = createTestApp();

    const first = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'A', phone: '9111111111' })
      .expect(201);

    const second = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'B', phone: '9111111111' })
      .expect(201);

    expect(second.body.warnings).toEqual([
      {
        code: 'DUPLICATE_OPEN_LEAD_PHONE',
        existingLeadIds: [first.body.lead.id],
      },
    ]);
  });

  it('returns 403 for trainer', async () => {
    const { app } = createTestApp('TRAINER');
    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'Nope', phone: '9000000000' })
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('LEAD_FORBIDDEN');
      });
  });

  it('creates with optional email and converts without invitedEmail', async () => {
    const { app } = createTestApp();

    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'Priya', phone: '9876543210', email: 'Priya@Gym.test' })
      .expect(201);
    expect(create.body.lead.email).toBe('priya@gym.test');
    const leadId = create.body.lead.id as string;

    const converted = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${leadId}/convert`)
      .send({ basePlanId, basePaymentStatus: 'paid' })
      .expect(201);

    expect(converted.body.lead.status).toBe('CONVERTED');
    expect(converted.body.lead.convertedMembershipInviteId).toBe('invite-1');
    expect(converted.body.membershipInvite.invitedEmail).toBe('priya@gym.test');
    expect(converted.body.membershipInvite.inviteeName).toBe('Priya');
  });

  it('converts with invitedEmail when the lead has none', async () => {
    const { app } = createTestApp();
    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'Walk-in', phone: '9876543210' })
      .expect(201);

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${create.body.lead.id}/convert`)
      .send({
        invitedEmail: 'walkin@gym.test',
        basePlanId,
        basePaymentStatus: 'paid',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.lead.email).toBe('walkin@gym.test');
      });
  });

  it('returns 422 when convert has no email', async () => {
    const { app } = createTestApp();
    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'Walk-in', phone: '9876543210' })
      .expect(201);

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${create.body.lead.id}/convert`)
      .send({ basePlanId, basePaymentStatus: 'paid' })
      .expect(422)
      .expect((res) => {
        expect(res.body.error.code).toBe('LEAD_EMAIL_REQUIRED');
      });
  });

  it('returns 409 on a second convert', async () => {
    const { app } = createTestApp();
    const create = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .send({ name: 'Priya', phone: '9876543210', email: 'priya@gym.test' })
      .expect(201);
    const leadId = create.body.lead.id as string;
    const body = { basePlanId, basePaymentStatus: 'paid' };

    await supertest(app).post(`/gym-orgs/${gymOrgId}/leads/${leadId}/convert`).send(body).expect(201);
    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${leadId}/convert`)
      .send(body)
      .expect(409)
      .expect((res) => {
        expect(res.body.error.code).toBe('LEAD_ALREADY_CONVERTED');
      });
  });
});
