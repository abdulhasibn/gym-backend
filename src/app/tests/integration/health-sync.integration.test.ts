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

describe('health sync HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('connects, syncs Health Connect metrics, and staff reads with WEARABLES grant', async () => {
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

    const connected = await supertest(app)
      .post('/me/wearable-connections')
      .set(clientHeader)
      .send({ provider: 'HEALTH_CONNECT' });
    expect(connected.status).toBe(201);
    expect(connected.body.connection.provider).toBe('HEALTH_CONNECT');

    const synced = await supertest(app)
      .post('/me/wearable-metrics/sync')
      .set(clientHeader)
      .send({
        provider: 'HEALTH_CONNECT',
        days: [
          {
            metricOn: '2026-08-18',
            steps: 8420,
            activeKcal: 410.5,
            workoutMinutes: 45,
            weightKg: 72.3,
          },
        ],
      });
    expect(synced.status).toBe(200);
    expect(synced.body.syncedDays).toBe(1);
    expect(synced.body.lastSyncedAt).toBeTruthy();

    const mine = await supertest(app).get('/me/wearable-metrics').set(clientHeader);
    expect(mine.status).toBe(200);
    expect(mine.body.wearableMetrics.items.length).toBeGreaterThanOrEqual(1);
    expect(mine.body.wearableMetrics.items[0].steps).toBe(8420);

    const progress = await supertest(app).get('/me/progress-logs').set(clientHeader);
    expect(progress.status).toBe(200);
    expect(
      progress.body.progressLogs.items.some(
        (log: { weightKg: number | null }) => log.weightKg === 72.3,
      ),
    ).toBe(true);

    const staffDenied = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/wearable-metrics`)
      .set(admin);
    expect(staffDenied.status).toBe(403);

    await supertest(app)
      .put(`/gym-orgs/${gymOrgId}/my-data-grants`)
      .set(clientHeader)
      .send({ optionalProfileAttributes: [], optionalClassGrants: ['WEARABLES'] })
      .expect(200);

    const staffRead = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/wearable-metrics`)
      .set(admin);
    expect(staffRead.status).toBe(200);
    expect(staffRead.body.wearableMetrics.items.length).toBeGreaterThanOrEqual(1);

    const disconnected = await supertest(app)
      .delete('/me/wearable-connections/HEALTH_CONNECT')
      .set(clientHeader);
    expect(disconnected.status).toBe(200);
    expect(disconnected.body.connection.active).toBe(false);
  });
});
