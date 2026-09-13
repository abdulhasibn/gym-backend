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
    expect(mine.body.attendances.items[0].checkedInAt).toBeDefined();
    expect(mine.body.attendances.items[0].checkedOutAt).toBeNull();

    const secondCheckIn = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/check-in`)
      .set(authHeader(client.accessToken));
    expect(secondCheckIn.status).toBe(409);
    expect(secondCheckIn.body.error.code).toBe('ALREADY_CHECKED_IN');

    const present = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/attendances/present`)
      .set(admin);
    expect(present.status).toBe(200);
    expect(present.body.attendances.total).toBeGreaterThanOrEqual(2);

    const checkOut = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/check-out`)
      .set(authHeader(client.accessToken));
    expect(checkOut.status).toBe(200);
    expect(checkOut.body.attendance.checkedOutAt).toBeDefined();
    expect(checkOut.body.attendance.durationSeconds).toBeGreaterThanOrEqual(0);

    const deskCheckOut = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-check-out`)
      .set(admin)
      .send({ clientUserId: otherClient.userId });
    expect(deskCheckOut.status).toBe(200);

    const presentAfter = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/attendances/present`)
      .set(admin);
    expect(presentAfter.status).toBe(200);
    expect(presentAfter.body.attendances.total).toBe(0);

    const reCheckIn = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/check-in`)
      .set(authHeader(client.accessToken));
    expect(reCheckIn.status).toBe(201);
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
