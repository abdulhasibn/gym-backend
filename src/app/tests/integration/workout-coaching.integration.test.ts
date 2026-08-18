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
  SEED_EXERCISE_BENCH_ID,
  signupViaOtp,
} from './harness';

describe('workout coaching HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('searches exercises, assigns a plan, and completes then uncompletes a day item', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId, addonPlanId } = await createBaseAndAddonPlans(
      app,
      owner.accessToken,
      gymOrgId,
    );
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
      addonPlanId,
    });
    const admin = authHeader(owner.accessToken);

    const search = await supertest(app).get('/exercises/search').query({ q: 'bench' }).set(admin);
    expect(search.status).toBe(200);
    expect(search.body.exercises[0]?.name).toBe('Bench Press (Barbell)');

    const assigned = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/clients/${client.userId}/workout-plans`)
      .set(admin)
      .send({
        title: 'PPL',
        days: [
          {
            dayLabel: 'Push',
            exercises: [
              {
                exerciseItemId: SEED_EXERCISE_BENCH_ID,
                sets: 3,
                reps: '8-10',
              },
            ],
          },
        ],
      });
    expect(assigned.status).toBe(201);
    expect(assigned.body.workoutPlan.title).toBe('PPL');
    expect(assigned.body.workoutPlan.days).toHaveLength(1);

    const staffGet = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/workout-plans`)
      .set(admin);
    expect(staffGet.status).toBe(200);
    expect(staffGet.body.workoutPlan.title).toBe('PPL');

    const mine = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-plan`)
      .set(authHeader(client.accessToken));
    expect(mine.status).toBe(200);
    const itemId = mine.body.workoutPlan.days[0].exercises[0].id as string;

    const completed = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/my-workout-plan/items/${itemId}/complete`)
      .set(authHeader(client.accessToken));
    expect(completed.status).toBe(204);

    const afterComplete = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-plan`)
      .set(authHeader(client.accessToken));
    expect(afterComplete.body.workoutPlan.days[0].exercises[0].completed).toBe(true);

    const uncompleted = await supertest(app)
      .delete(`/gym-orgs/${gymOrgId}/my-workout-plan/items/${itemId}/complete`)
      .set(authHeader(client.accessToken));
    expect(uncompleted.status).toBe(204);
  });
});
