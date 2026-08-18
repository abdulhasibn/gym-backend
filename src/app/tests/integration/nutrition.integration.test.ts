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
  SEED_FOOD_IDLI_ID,
  SEED_FOOD_IDLI_PIECE_SERVING_ID,
  signupViaOtp,
} from './harness';

describe('nutrition diary HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('searches foods, logs an extra, reads the diary, and unlogs it', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const header = authHeader(client.accessToken);

    const search = await supertest(app).get('/foods/search').query({ q: 'idli' }).set(header);
    expect(search.status).toBe(200);
    expect(search.body.foods[0]?.name).toBe('Idli');
    expect(search.body.foods[0]?.defaultUnit).toBe('PIECE');

    const logged = await supertest(app).post('/me/calorie-logs/items').set(header).send({
      foodItemId: SEED_FOOD_IDLI_ID,
      servingId: SEED_FOOD_IDLI_PIECE_SERVING_ID,
      quantity: 2,
      mealSlot: 'BREAKFAST',
    });
    expect(logged.status).toBe(201);
    const itemId = logged.body.calorieLog.slots
      .flatMap((slot: { items: ReadonlyArray<{ id: string }> }) => slot.items)
      .at(0)?.id as string;
    expect(itemId).toEqual(expect.any(String));

    const diary = await supertest(app).get('/me/calorie-logs').set(header);
    expect(diary.status).toBe(200);
    expect(diary.body.calorieLog.totalCalories).toBeGreaterThan(0);

    const staffDenied = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/calorie-logs`)
      .set(authHeader(owner.accessToken));
    expect(staffDenied.status).toBe(403);

    await supertest(app)
      .put(`/gym-orgs/${gymOrgId}/my-data-grants`)
      .set(header)
      .send({
        optionalProfileAttributes: [],
        optionalClassGrants: ['CALORIES'],
      })
      .expect(200);

    const staff = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/calorie-logs`)
      .set(authHeader(owner.accessToken));
    expect(staff.status).toBe(200);
    expect(staff.body.calorieLog.totalCalories).toBeGreaterThan(0);

    const unlogged = await supertest(app).delete(`/me/calorie-logs/items/${itemId}`).set(header);
    expect(unlogged.status).toBe(200);
    expect(unlogged.body.calorieLog.totalCalories).toBe(0);
  });
});
