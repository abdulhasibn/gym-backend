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

describe('gym stand-up HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('lets staff create, list, get, and patch a gym', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });

    const created = await supertest(app)
      .post('/gym-orgs')
      .set(authHeader(owner.accessToken))
      .send({ name: 'North Star Fitness', timezone: 'Asia/Kolkata' });

    expect(created.status).toBe(201);
    expect(created.body.gymOrg).toMatchObject({
      name: 'North Star Fitness',
      timezone: 'Asia/Kolkata',
      ownerUserId: owner.userId,
    });
    const gymOrgId = created.body.gymOrg.id as string;

    const listed = await supertest(app).get('/gym-orgs').set(authHeader(owner.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.gymOrgs).toHaveLength(1);
    expect(listed.body.gymOrgs[0]).toMatchObject({
      id: gymOrgId,
      name: 'North Star Fitness',
      isOwner: true,
    });

    const got = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}`)
      .set(authHeader(owner.accessToken));
    expect(got.status).toBe(200);
    expect(got.body.gymOrg.name).toBe('North Star Fitness');

    const patched = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'North Star HQ', timezone: 'Asia/Kolkata' });
    expect(patched.status).toBe(200);
    expect(patched.body.gymOrg.name).toBe('North Star HQ');

    const me = await supertest(app).get('/auth/me').set(authHeader(owner.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.user.roleCode).toBe('ADMIN');
  });

  it('forbids a client from creating a gym', async () => {
    const client = await signupViaOtp(app, { lane: 'CLIENT', name: 'Alex Client' });
    const response = await supertest(app)
      .post('/gym-orgs')
      .set(authHeader(client.accessToken))
      .send({ name: 'Client Gym' });
    expect(response.status).toBe(403);
  });

  it('forbids another staff member from reading or patching the gym', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const stranger = await signupViaOtp(app, { lane: 'STAFF', name: 'Other Staff' });

    const got = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}`)
      .set(authHeader(stranger.accessToken));
    expect(got.status).toBe(404);

    const patched = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}`)
      .set(authHeader(stranger.accessToken))
      .send({ name: 'Hijacked', timezone: 'Asia/Kolkata' });
    expect(patched.status).toBe(403);
  });

  it('rejects gym create without a Bearer token', async () => {
    const response = await supertest(app).post('/gym-orgs').send({ name: 'North Star Fitness' });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'AUTHENTICATION_FAILED' } });
  });
});
