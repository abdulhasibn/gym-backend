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

describe('profile and progress HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('lets a client patch profile and upsert progress, then staff read by grant', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const clientHeader = authHeader(client.accessToken);
    const admin = authHeader(owner.accessToken);

    const patched = await supertest(app).patch('/me/profile').set(clientHeader).send({
      heightCm: 170,
      weightKg: 70,
      dob: '1994-05-01',
      gender: 'MALE',
      medicalNotes: 'none',
    });
    expect(patched.status).toBe(200);
    expect(patched.body.profile).toMatchObject({
      heightCm: 170,
      weightKg: 70,
      dob: '1994-05-01',
      gender: 'MALE',
    });

    const mine = await supertest(app).get('/me/profile').set(clientHeader);
    expect(mine.status).toBe(200);
    expect(mine.body.profile.heightCm).toBe(170);

    const upserted = await supertest(app)
      .put('/me/progress-logs')
      .set(clientHeader)
      .send({ logDate: '2026-08-01', weightKg: 69.5, notes: 'cut' });
    expect(upserted.status).toBe(200);
    expect(upserted.body.progressLog.weightKg).toBe(69.5);

    const logs = await supertest(app).get('/me/progress-logs').set(clientHeader);
    expect(logs.status).toBe(200);
    expect(logs.body.progressLogs.items.length).toBeGreaterThanOrEqual(1);

    const staffProgressDenied = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/progress-logs`)
      .set(admin);
    expect(staffProgressDenied.status).toBe(403);

    await supertest(app)
      .put(`/gym-orgs/${gymOrgId}/my-data-grants`)
      .set(clientHeader)
      .send({
        optionalProfileAttributes: ['GENDER', 'MEDICAL_NOTES'],
        optionalClassGrants: ['PROGRESS'],
      })
      .expect(200);

    const staffProfile = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/profile`)
      .set(admin);
    expect(staffProfile.status).toBe(200);
    expect(staffProfile.body.profile.heightCm).toBe(170);
    expect(staffProfile.body.profile.gender).toBe('MALE');
    expect(staffProfile.body.profile.medicalNotes).toBe('none');

    const staffProgress = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/progress-logs`)
      .set(admin);
    expect(staffProgress.status).toBe(200);
    expect(staffProgress.body.progressLogs.items.length).toBeGreaterThanOrEqual(1);
  });

  it('forbids staff at another gym from reading profile', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const other = await signupViaOtp(app, { lane: 'STAFF', name: 'Other Owner' });
    const otherGymId = await createGymOrg(app, other.accessToken, 'Other Gym');

    const response = await supertest(app)
      .get(`/gym-orgs/${otherGymId}/clients/${client.userId}/profile`)
      .set(authHeader(other.accessToken));
    expect(response.status).toBe(403);
  });
});
