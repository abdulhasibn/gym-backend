import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { AcceptStaffInviteUseCase } from '../../application/accept-staff-invite.use-case';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { CreateStaffInviteUseCase } from '../../application/create-staff-invite.use-case';
import { GetGymOrgUseCase } from '../../application/get-gym-org.use-case';
import { GymOrgAdminPolicy } from '../../application/gym-org-admin.policy';
import { ListGymStaffInvitesUseCase } from '../../application/list-gym-staff-invites.use-case';
import { ListGymTrainersUseCase } from '../../application/list-gym-trainers.use-case';
import { ListMyGymOrgsUseCase } from '../../application/list-my-gym-orgs.use-case';
import { ListMyStaffInviteInboxUseCase } from '../../application/list-my-staff-invite-inbox.use-case';
import { RevokeStaffInviteUseCase } from '../../application/revoke-staff-invite.use-case';
import { UpdateGymOrgUseCase } from '../../application/update-gym-org.use-case';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { StaffCode } from '../../domain/staff-code.value-object';
import { GymOrgController } from '../../presentation/gym-org.controller';
import { mapGymOrgError } from '../../presentation/gym-org.error-mapper';
import { createGymOrgRouter, createGymTrainersRouter } from '../../presentation/gym-org.routes';
import { FixedClock } from '../fakes/fixed-clock';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';
import { InMemoryStaffInviteRepository } from '../fakes/in-memory-staff-invite.repository';
import { InMemoryStaffUserLookup } from '../fakes/in-memory-staff-user-lookup';
import { InMemoryTrainerProfileQueries } from '../fakes/in-memory-trainer-profile.queries';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

function createTestApp(
  roleCode: 'STAFF_UNASSIGNED' | 'CLIENT' | 'ADMIN' | 'TRAINER' = 'STAFF_UNASSIGNED',
) {
  const gymOrgs = new InMemoryGymOrgRepository();
  const staffInvites = new InMemoryStaffInviteRepository();
  const staffUsers = new InMemoryStaffUserLookup();
  const trainers = new InMemoryTrainerProfileQueries();
  const clock = new FixedClock(new Date('2026-08-04T00:00:00.000Z'));
  const policy = new GymOrgAdminPolicy(gymOrgs);
  let idCounter = 0;

  staffUsers.seed('STF-TRAINER01', {
    userId: toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    roleCode: 'STAFF_UNASSIGNED',
    lane: 'STAFF',
  });

  const controller = new GymOrgController(
    new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()),
    new ListMyGymOrgsUseCase(gymOrgs),
    new GetGymOrgUseCase(gymOrgs),
    new UpdateGymOrgUseCase(gymOrgs, policy, clock),
    new CreateStaffInviteUseCase(policy, staffInvites, staffUsers, clock, {
      generate: () => {
        idCounter += 1;
        return `cccccccc-cccc-4ccc-8ccc-ccccccccccc${idCounter}`;
      },
    }),
    new ListGymStaffInvitesUseCase(policy, staffInvites),
    new ListGymTrainersUseCase(policy, trainers),
    new ListMyStaffInviteInboxUseCase(staffInvites),
    new AcceptStaffInviteUseCase(staffInvites, clock),
    new RevokeStaffInviteUseCase(policy, staffInvites, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, {
      userId: toUserId('11111111-1111-4111-8111-111111111111'),
      roleCode,
      lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
      email: 'owner@example.com',
      staffCode: roleCode === 'CLIENT' ? null : 'STF-OWNER',
    });
    next();
  };

  const app = express();
  app.use(express.json());
  app.use('/gym-orgs', createGymOrgRouter(controller, authenticate));
  app.use('/gym-orgs/:gymOrgId/trainers', createGymTrainersRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapGymOrgError]));

  return { app, gymOrgs, staffInvites, staffUsers, trainers, clock };
}

describe('gym-org routes', () => {
  it('creates and lists the authenticated staff member’s organization', async () => {
    const { app } = createTestApp();

    const create = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness', contactEmail: 'hello@example.com' })
      .expect(201);

    expect(create.body.gymOrg).toMatchObject({
      name: 'North Star Fitness',
      contactEmail: 'hello@example.com',
      timezone: 'Asia/Kolkata',
    });

    const list = await supertest(app).get('/gym-orgs').expect(200);
    expect(list.body.gymOrgs).toEqual([
      {
        id: create.body.gymOrg.id,
        name: 'North Star Fitness',
        timezone: 'Asia/Kolkata',
        isOwner: true,
      },
    ]);
  });

  it('accepts explicit nulls for optional create fields', async () => {
    const { app } = createTestApp();
    const create = await supertest(app)
      .post('/gym-orgs')
      .send({
        name: 'North Star Fitness',
        address: null,
        contactPhone: null,
        contactEmail: null,
        logoUrl: null,
        timezone: 'Asia/Kolkata',
      })
      .expect(201);

    expect(create.body.gymOrg).toMatchObject({
      name: 'North Star Fitness',
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: 'Asia/Kolkata',
    });
  });

  it('rejects organization creation by clients', async () => {
    const { app } = createTestApp('CLIENT');
    const response = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness' })
      .expect(403);

    expect(response.body.error.code).toBe('GYM_ORG_CREATION_FORBIDDEN');
  });

  it('returns validation errors for an invalid timezone', async () => {
    const { app } = createTestApp();
    const response = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness', timezone: 'Not/A-Timezone' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation errors for a blank organization name', async () => {
    const { app } = createTestApp();
    const response = await supertest(app).post('/gym-orgs').send({ name: '   ' }).expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('gets and patches an organization for an affiliated admin', async () => {
    const { app } = createTestApp('ADMIN');
    // Seed org as STAFF_UNASSIGNED create path via ADMIN also allowed
    const create = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness' })
      .expect(201);

    const gymOrgId = create.body.gymOrg.id as string;

    const get = await supertest(app).get(`/gym-orgs/${gymOrgId}`).expect(200);
    expect(get.body.gymOrg).toMatchObject({
      id: gymOrgId,
      name: 'North Star Fitness',
      isOwner: true,
    });

    const patch = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}`)
      .send({
        name: 'North Star HQ',
        address: '12 Main',
        contactPhone: null,
        contactEmail: null,
        logoUrl: null,
        timezone: 'Asia/Kolkata',
      })
      .expect(200);

    expect(patch.body.gymOrg.name).toBe('North Star HQ');
    expect(patch.body.gymOrg.address).toBe('12 Main');
  });

  it('creates, lists, and revokes staff invites', async () => {
    const { app } = createTestApp('ADMIN');
    const create = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness' })
      .expect(201);
    const gymOrgId = create.body.gymOrg.id as string;

    const invite = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .send({ staffCode: 'STF-TRAINER01', targetRole: 'TRAINER' })
      .expect(201);

    expect(invite.body.staffInvite).toMatchObject({
      targetRole: 'TRAINER',
      status: 'PENDING',
      invitedUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });

    const list = await supertest(app).get(`/gym-orgs/${gymOrgId}/staff-invites`).expect(200);
    expect(list.body.staffInvites.items).toHaveLength(1);

    const revoked = await supertest(app)
      .post(`/gym-orgs/staff-invites/${invite.body.staffInvite.id}/revoke`)
      .expect(200);
    expect(revoked.body.staffInvite.status).toBe('REVOKED');
  });

  it('lists gym trainers for an admin', async () => {
    const { app, trainers } = createTestApp('ADMIN');
    const create = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness' })
      .expect(201);
    const gymOrgId = create.body.gymOrg.id as string;

    trainers.seed({
      trainerProfileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: toUserId('11111111-1111-4111-8111-111111111111'),
      gymOrgId: toGymOrgId(gymOrgId),
      name: 'Owner Admin',
      email: 'owner@example.com',
      staffCode: 'STF-OWNER',
      bio: null,
      isAdmin: true,
      createdAt: '2026-08-04T00:00:00.000Z',
    });
    trainers.seed({
      trainerProfileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      gymOrgId: toGymOrgId(gymOrgId),
      name: 'Ada Trainer',
      email: 'trainer@example.com',
      staffCode: 'STF-TRAINER01',
      bio: 'PT',
      isAdmin: false,
      createdAt: '2026-08-05T00:00:00.000Z',
    });

    const list = await supertest(app).get(`/gym-orgs/${gymOrgId}/trainers`).expect(200);

    expect(list.body.trainers).toMatchObject({
      total: 2,
      limit: 20,
      offset: 0,
    });
    expect(list.body.trainers.items).toEqual([
      {
        trainerProfileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: '11111111-1111-4111-8111-111111111111',
        gymOrgId,
        name: 'Owner Admin',
        email: 'owner@example.com',
        staffCode: 'STF-OWNER',
        bio: null,
        isAdmin: true,
        createdAt: '2026-08-04T00:00:00.000Z',
      },
      {
        trainerProfileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        gymOrgId,
        name: 'Ada Trainer',
        email: 'trainer@example.com',
        staffCode: 'STF-TRAINER01',
        bio: 'PT',
        isAdmin: false,
        createdAt: '2026-08-05T00:00:00.000Z',
      },
    ]);
  });

  it('rejects listing trainers when the actor is not an admin', async () => {
    const { app, gymOrgs } = createTestApp('TRAINER');
    const created = await gymOrgs.createOwnedGymOrg({
      ownerUserId: toUserId('11111111-1111-4111-8111-111111111111'),
      name: GymOrgName.create('Gym'),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });

    const response = await supertest(app).get(`/gym-orgs/${created.id}/trainers`).expect(403);

    expect(response.body.error.code).toBe('GYM_ORG_ADMIN_FORBIDDEN');
  });

  it('rejects staff invite creation when actor is not an admin', async () => {
    const { app, gymOrgs } = createTestApp('TRAINER');
    const created = await gymOrgs.createOwnedGymOrg({
      ownerUserId: toUserId('11111111-1111-4111-8111-111111111111'),
      name: GymOrgName.create('Gym'),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });

    const response = await supertest(app)
      .post(`/gym-orgs/${created.id}/staff-invites`)
      .send({ staffCode: 'STF-TRAINER01', targetRole: 'TRAINER' })
      .expect(403);

    expect(response.body.error.code).toBe('STAFF_INVITE_FORBIDDEN');
  });

  it('accepts a staff invite for the invitee', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const staffInvites = new InMemoryStaffInviteRepository();
    const staffUsers = new InMemoryStaffUserLookup();
    const clock = new FixedClock(new Date('2026-08-04T00:00:00.000Z'));
    const policy = new GymOrgAdminPolicy(gymOrgs);

    const ownerId = toUserId('11111111-1111-4111-8111-111111111111');
    const inviteeId = toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    const created = await gymOrgs.createOwnedGymOrg({
      ownerUserId: ownerId,
      name: GymOrgName.create('Gym'),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });
    staffInvites.seedAdmin(created.id, ownerId);
    staffInvites.seedGymProfile({
      id: created.id,
      name: 'Gym',
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: 'Asia/Kolkata',
    });
    staffUsers.seed('STF-TRAINER01', {
      userId: inviteeId,
      roleCode: 'STAFF_UNASSIGNED',
      lane: 'STAFF',
    });

    const invite = await new CreateStaffInviteUseCase(policy, staffInvites, staffUsers, clock, {
      generate: () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    }).execute(
      {
        userId: ownerId,
        roleCode: 'ADMIN',
        lane: 'STAFF',
        email: 'owner@example.com',
        staffCode: 'STF-OWNER',
      },
      {
        gymOrgId: created.id,
        staffCode: StaffCode.create('STF-TRAINER01'),
        targetRole: 'TRAINER',
      },
    );

    const controller = new GymOrgController(
      new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()),
      new ListMyGymOrgsUseCase(gymOrgs),
      new GetGymOrgUseCase(gymOrgs),
      new UpdateGymOrgUseCase(gymOrgs, policy, clock),
      new CreateStaffInviteUseCase(policy, staffInvites, staffUsers, clock, {
        generate: () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccd',
      }),
      new ListGymStaffInvitesUseCase(policy, staffInvites),
      new ListGymTrainersUseCase(policy, new InMemoryTrainerProfileQueries()),
      new ListMyStaffInviteInboxUseCase(staffInvites),
      new AcceptStaffInviteUseCase(staffInvites, clock),
      new RevokeStaffInviteUseCase(policy, staffInvites, clock),
    );

    const authenticate: RequestHandler = (req, _res, next) => {
      setAuthenticatedActor(req, {
        userId: inviteeId,
        roleCode: 'STAFF_UNASSIGNED',
        lane: 'STAFF',
        email: 'trainer@example.com',
        staffCode: 'STF-TRAINER01',
      });
      next();
    };

    const app = express();
    app.use(express.json());
    app.use('/gym-orgs', createGymOrgRouter(controller, authenticate));
    app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapGymOrgError]));

    const inbox = await supertest(app).get('/gym-orgs/staff-invites/inbox').expect(200);
    expect(inbox.body.staffInvites.items).toHaveLength(1);
    expect(inbox.body.staffInvites.items[0].gym).toEqual({
      id: created.id,
      name: 'Gym',
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: 'Asia/Kolkata',
    });

    const accepted = await supertest(app)
      .post(`/gym-orgs/staff-invites/${invite.id}/accept`)
      .expect(200);
    expect(accepted.body.staffInvite.status).toBe('ACCEPTED');
  });
});
