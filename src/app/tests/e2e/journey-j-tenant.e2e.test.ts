import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  clientCheckIn,
  inviteAndAcceptTrainer,
  listClientSubscriptions,
  loadIntegrationApp,
  onboardClient,
  provisionIronCore,
  provisionTitan,
  resetLocalDb,
  SEED_FOOD_IDLI_ID,
  SEED_FOOD_IDLI_PIECE_SERVING_ID,
} from './harness';

describe('Journey J — Tenant isolation (IronCore vs Titan)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('TENANT-001..004: Gym A never reads or writes Gym B ops / client-owned data', async () => {
    const iron = await provisionIronCore(app);
    const titan = await provisionTitan(app);
    const rizwan = await inviteAndAcceptTrainer(iron, 'Rizwan Ali');

    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      includeAddon: true,
      optionalClassGrants: ['PROGRESS', 'CALORIES'],
    });
    const bilal = await onboardClient(titan, {
      name: 'Bilal Ahmed',
      includeAddon: true,
      optionalClassGrants: [],
    });

    await clientCheckIn(iron, sameer.client);
    await clientCheckIn(titan, bilal.client);

    const lead = await supertest(app)
      .post(`/gym-orgs/${titan.gymOrgId}/leads`)
      .set(authHeader(titan.owner.accessToken))
      .send({ name: 'Titan Lead', phone: '9000000001', source: 'desk' });
    expect(lead.status).toBe(201);
    const titanLeadId = lead.body.lead.id as string;

    const arif = authHeader(iron.owner.accessToken);

    const rosterLeak = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/members`)
      .set(arif);
    expect(rosterLeak.status).toBeGreaterThanOrEqual(400);

    const leadLeak = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/leads/${titanLeadId}`)
      .set(arif);
    expect(leadLeak.status).toBeGreaterThanOrEqual(400);

    const attendanceLeak = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/attendances`)
      .set(arif);
    expect(attendanceLeak.status).toBeGreaterThanOrEqual(400);

    const bilalAttendanceLeak = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/attendances/clients/${bilal.client.userId}`)
      .set(arif);
    expect(bilalAttendanceLeak.status).toBeGreaterThanOrEqual(400);

    const titanSubs = await listClientSubscriptions(titan, bilal.client.userId);
    const titanBase = titanSubs.find((row) => row.kind === 'BASE');
    expect(titanBase).toBeDefined();

    const subLeak = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/clients/${bilal.client.userId}/subscriptions`)
      .set(arif);
    expect(subLeak.status).toBeGreaterThanOrEqual(400);

    const paymentLeak = await supertest(app)
      .patch(`/gym-orgs/${titan.gymOrgId}/subscriptions/${titanBase!.id}/payment`)
      .set(arif)
      .send({ paymentStatus: 'paid' });
    expect(paymentLeak.status).toBeGreaterThanOrEqual(400);

    const progressLeak = await supertest(app)
      .get(`/gym-orgs/${titan.gymOrgId}/clients/${bilal.client.userId}/progress-logs`)
      .set(arif);
    expect(progressLeak.status).toBeGreaterThanOrEqual(400);

    const progressViaWrongGym = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/clients/${bilal.client.userId}/progress-logs`)
      .set(arif);
    expect(progressViaWrongGym.status).toBeGreaterThanOrEqual(400);

    const coachingLeak = await supertest(app)
      .post(`/gym-orgs/${titan.gymOrgId}/clients/${bilal.client.userId}/diet-plans`)
      .set(authHeader(rizwan.session.accessToken))
      .send({
        title: 'Cross-tenant write',
        meals: [
          {
            mealSlot: 'BREAKFAST',
            items: [
              {
                foodItemId: SEED_FOOD_IDLI_ID,
                servingId: SEED_FOOD_IDLI_PIECE_SERVING_ID,
                quantity: 1,
              },
            ],
          },
        ],
      });
    expect(coachingLeak.status).toBeGreaterThanOrEqual(400);

    const ironMembers = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/members`)
      .set(arif);
    expect(ironMembers.status).toBe(200);
    expect(
      ironMembers.body.members.some(
        (row: { clientUserId: string }) => row.clientUserId === bilal.client.userId,
      ),
    ).toBe(false);
  });
});
