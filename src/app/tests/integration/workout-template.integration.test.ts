import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  createGymOrg,
  loadIntegrationApp,
  resetLocalDb,
  SEED_EXERCISE_BENCH_ID,
  signupViaOtp,
} from './harness';

const templateBody = {
  title: 'Circuit library',
  exercises: [
    {
      exerciseItemId: SEED_EXERCISE_BENCH_ID,
      sets: 3,
      reps: '8-12',
    },
  ],
};

describe('workout plan templates HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('manages workout templates with gym-global read and author mutate', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const admin = authHeader(owner.accessToken);

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/workout-plan-templates`)
      .set(admin)
      .send(templateBody);
    expect(created.status).toBe(201);
    const templateId = created.body.workoutPlanTemplate.id as string;
    expect(created.body.workoutPlanTemplate.exercises[0].exerciseItemId).toBe(SEED_EXERCISE_BENCH_ID);

    const listed = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/workout-plan-templates`)
      .set(admin);
    expect(listed.status).toBe(200);
    expect(listed.body.workoutPlanTemplates.items).toHaveLength(1);

    const got = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/workout-plan-templates/${templateId}`)
      .set(admin);
    expect(got.status).toBe(200);
    expect(got.body.workoutPlanTemplate.title).toBe('Circuit library');
    expect(got.body.workoutPlanTemplate.exercises[0].name).toBeTruthy();

    const patched = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/workout-plan-templates/${templateId}`)
      .set(admin)
      .send({ ...templateBody, title: 'Circuit v2' });
    expect(patched.status).toBe(200);
    expect(patched.body.workoutPlanTemplate.title).toBe('Circuit v2');

    const duplicated = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/workout-plan-templates/${templateId}/duplicate`)
      .set(admin);
    expect(duplicated.status).toBe(201);
    expect(duplicated.body.workoutPlanTemplate.id).not.toBe(templateId);
    expect(duplicated.body.workoutPlanTemplate.clonedFromId).toBe(templateId);

    const deleted = await supertest(app)
      .delete(
        `/gym-orgs/${gymOrgId}/workout-plan-templates/${duplicated.body.workoutPlanTemplate.id}`,
      )
      .set(admin);
    expect(deleted.status).toBe(204);

    const afterDelete = await supertest(app)
      .get(
        `/gym-orgs/${gymOrgId}/workout-plan-templates/${duplicated.body.workoutPlanTemplate.id}`,
      )
      .set(admin);
    expect(afterDelete.status).toBe(404);
  });
});
