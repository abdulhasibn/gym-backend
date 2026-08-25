import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  acceptInviteWithGrants,
  authHeader,
  clientCheckIn,
  createMembershipInvite,
  getMyDataGrants,
  listMembers,
  loadIntegrationApp,
  offboardMember,
  onboardClient,
  provisionIronCore,
  provisionTitan,
  resetLocalDb,
  SEED_FOOD_IDLI_ID,
  SEED_FOOD_IDLI_PIECE_SERVING_ID,
} from './harness';

describe('Journey I — Privacy lifecycle (grants, revoke, offboard, rejoin)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('GRANT-010 / GRANT-011 / GRANT-012 / PRIV-001: grant → revoke → offboard → rejoin with fresh grants', async () => {
    const iron = await provisionIronCore(app);
    const titan = await provisionTitan(app);
    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      includeAddon: false,
      optionalClassGrants: ['PROGRESS', 'CALORIES'],
    });
    const clientHeader = authHeader(sameer.client.accessToken);
    const arif = authHeader(iron.owner.accessToken);

    await supertest(app)
      .put('/me/progress-logs')
      .set(clientHeader)
      .send({ logDate: '2026-08-01', weightKg: 78.2, notes: 'baseline' })
      .expect(200);

    await supertest(app)
      .post('/me/calorie-logs/items')
      .set(clientHeader)
      .send({
        foodItemId: SEED_FOOD_IDLI_ID,
        servingId: SEED_FOOD_IDLI_PIECE_SERVING_ID,
        quantity: 2,
        mealSlot: 'BREAKFAST',
      })
      .expect(201);

    const progressOk = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/progress-logs`)
      .set(arif);
    expect(progressOk.status).toBe(200);
    expect(progressOk.body.progressLogs.items.length).toBeGreaterThanOrEqual(1);

    const caloriesOk = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/calorie-logs`)
      .set(arif);
    expect(caloriesOk.status).toBe(200);
    expect(caloriesOk.body.calorieLog.totalCalories).toBeGreaterThan(0);

    const revoked = await supertest(app)
      .put(`/gym-orgs/${iron.gymOrgId}/my-data-grants`)
      .set(clientHeader)
      .send({
        optionalProfileAttributes: [],
        optionalClassGrants: ['PROGRESS'],
      });
    expect(revoked.status).toBe(200);
    expect(revoked.body.dataGrants.classGrants).toContain('PROGRESS');
    expect(revoked.body.dataGrants.classGrants).not.toContain('CALORIES');

    const caloriesDenied = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/calorie-logs`)
      .set(arif);
    expect(caloriesDenied.status).toBe(403);

    const progressStill = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/progress-logs`)
      .set(arif);
    expect(progressStill.status).toBe(200);

    const checkIn = await clientCheckIn(iron, sameer.client);
    expect(checkIn.status).toBe(201);

    await offboardMember(iron, sameer.membershipId);

    const grantsAfterOffboard = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/my-data-grants`)
      .set(clientHeader);
    expect(grantsAfterOffboard.status).toBeGreaterThanOrEqual(400);

    const staffProgressAfter = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/progress-logs`)
      .set(arif);
    expect(staffProgressAfter.status).toBe(403);

    const staffCaloriesAfter = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/calorie-logs`)
      .set(arif);
    expect(staffCaloriesAfter.status).toBe(403);

    const ironAttendance = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/attendances/clients/${sameer.client.userId}`)
      .set(arif);
    expect(ironAttendance.status).toBe(200);
    expect(ironAttendance.body.attendances.total).toBeGreaterThanOrEqual(1);

    const titanInvite = await createMembershipInvite(titan, {
      client: sameer.client,
      inviteeName: 'Sameer Rahman',
      includeAddon: false,
      basePaymentStatus: 'paid',
    });
    const rejoined = await acceptInviteWithGrants(titan, {
      client: sameer.client,
      inviteId: titanInvite.inviteId,
      optionalClassGrants: [],
    });
    expect(rejoined.status).toBe(200);

    const titanGrants = await getMyDataGrants(titan, sameer.client);
    expect(titanGrants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT']),
    );
    expect(titanGrants.classGrants).not.toContain('PROGRESS');
    expect(titanGrants.classGrants).not.toContain('CALORIES');

    const titanStaffProgress = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/clients/${sameer.client.userId}/progress-logs`)
      .set(authHeader(titan.owner.accessToken));
    expect(titanStaffProgress.status).toBe(403);

    const titanDay = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/attendances`)
      .set(authHeader(titan.owner.accessToken));
    expect(titanDay.status).toBe(200);
    expect(titanDay.body.attendances.total).toBe(0);

    const titanClientHistory = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/attendances/clients/${sameer.client.userId}`)
      .set(authHeader(titan.owner.accessToken));
    expect(titanClientHistory.status).toBe(200);
    expect(titanClientHistory.body.attendances.total).toBe(0);

    const ironStillActive = (await listMembers(iron)).filter(
      (row) => row.clientUserId === sameer.client.userId && row.status === 'ACTIVE',
    );
    expect(ironStillActive).toHaveLength(0);
  });
});
