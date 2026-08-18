import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  createGymOrg,
  loadIntegrationApp,
  resetLocalDb,
  signupViaOtp,
} from './harness';

describe('staff invites HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('invites a trainer who accepts and then appears on the gym trainer list', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });
    expect(trainer.staffCode).toEqual(expect.any(String));

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' });
    expect(created.status).toBe(201);
    expect(created.body.staffInvite).toMatchObject({
      targetRole: 'TRAINER',
      status: 'PENDING',
      invitedUserId: trainer.userId,
    });
    const inviteId = created.body.staffInvite.id as string;

    const listed = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.staffInvites.items).toHaveLength(1);

    const inbox = await supertest(app)
      .get('/gym-orgs/staff-invites/inbox')
      .set(authHeader(trainer.accessToken));
    expect(inbox.status).toBe(200);
    expect(inbox.body.staffInvites.items[0]?.id).toBe(inviteId);

    const accepted = await supertest(app)
      .post(`/gym-orgs/staff-invites/${inviteId}/accept`)
      .set(authHeader(trainer.accessToken));
    expect(accepted.status).toBe(200);
    expect(accepted.body.staffInvite.status).toBe('ACCEPTED');

    const me = await supertest(app).get('/auth/me').set(authHeader(trainer.accessToken));
    expect(me.body.user.roleCode).toBe('TRAINER');

    const trainers = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/trainers`)
      .set(authHeader(owner.accessToken));
    expect(trainers.status).toBe(200);
    expect(trainers.body.trainers.items.map((row: { userId: string }) => row.userId)).toEqual(
      expect.arrayContaining([owner.userId, trainer.userId]),
    );
  });

  it('revokes an unused invite so it cannot be accepted', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' });
    const inviteId = created.body.staffInvite.id as string;

    const revoked = await supertest(app)
      .post(`/gym-orgs/staff-invites/${inviteId}/revoke`)
      .set(authHeader(owner.accessToken));
    expect(revoked.status).toBe(200);
    expect(revoked.body.staffInvite.status).toBe('REVOKED');

    const accepted = await supertest(app)
      .post(`/gym-orgs/staff-invites/${inviteId}/accept`)
      .set(authHeader(trainer.accessToken));
    expect(accepted.status).toBeGreaterThanOrEqual(400);
  });

  it('forbids the wrong user from accepting a staff invite', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });
    const stranger = await signupViaOtp(app, { lane: 'STAFF', name: 'Eve Staff' });

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' });

    const response = await supertest(app)
      .post(`/gym-orgs/staff-invites/${created.body.staffInvite.id}/accept`)
      .set(authHeader(stranger.accessToken));
    expect(response.status).toBe(403);
  });

  it('forbids a client from creating a staff invite', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const client = await signupViaOtp(app, { lane: 'CLIENT', name: 'Alex Client' });
    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });

    const response = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(client.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' });
    expect(response.status).toBe(403);
  });
});
