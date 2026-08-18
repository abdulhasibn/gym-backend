import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  createBaseAndAddonPlans,
  createGymOrg,
  inviteAndAcceptClient,
  loadIntegrationApp,
  resetLocalDb,
  signupViaOtp,
} from './harness';

describe('attendance HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('records client check-in, desk mark, gym-day, per-client, and my history', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const admin = authHeader(owner.accessToken);

    const checkIn = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/check-in`)
      .set(authHeader(client.accessToken));
    expect(checkIn.status).toBe(201);
    expect(checkIn.body.attendance.clientUserId).toBe(client.userId);

    const gymDay = await supertest(app).get(`/gym-orgs/${gymOrgId}/attendances`).set(admin);
    expect(gymDay.status).toBe(200);
    expect(gymDay.body.attendances.total).toBeGreaterThanOrEqual(1);

    const otherClient = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const desk = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-mark`)
      .set(admin)
      .send({ clientUserId: otherClient.userId });
    expect(desk.status).toBe(201);

    const perClient = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/attendances/clients/${client.userId}`)
      .set(admin);
    expect(perClient.status).toBe(200);
    expect(perClient.body.attendances.total).toBeGreaterThanOrEqual(1);

    const mine = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-attendances`)
      .set(authHeader(client.accessToken));
    expect(mine.status).toBe(200);
    expect(mine.body.attendances.total).toBeGreaterThanOrEqual(1);
  });

  it('forbids a client from desk-marking attendance', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });

    const response = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-mark`)
      .set(authHeader(client.accessToken))
      .send({ clientUserId: client.userId });
    expect(response.status).toBe(403);
  });

  it('forbids check-in after offboard', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const members = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/members`)
      .set(authHeader(owner.accessToken));
    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/members/${members.body.members[0].membershipId}/offboard`)
      .set(authHeader(owner.accessToken))
      .expect(200);

    const checkIn = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/check-in`)
      .set(authHeader(client.accessToken));
    expect(checkIn.status).toBeGreaterThanOrEqual(400);
  });
});
