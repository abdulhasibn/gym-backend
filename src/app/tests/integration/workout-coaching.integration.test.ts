import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
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

describe('workout schedule coaching HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('upserts schedule, completes within D..D+2, and overlays dayDone', async () => {
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
    const clientAuth = authHeader(client.accessToken);

    const search = await supertest(app).get('/exercises/search').query({ q: 'bench' }).set(admin);
    expect(search.status).toBe(200);
    expect(search.body.exercises[0]?.name).toBe('Bench Press (Barbell)');

    const template = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/workout-plan-templates`)
      .set(admin)
      .send({
        title: 'Push AM',
        exercises: [
          {
            exerciseItemId: SEED_EXERCISE_BENCH_ID,
            sets: 3,
            reps: '8-10',
          },
        ],
      });
    expect(template.status).toBe(201);
    const templateId = template.body.workoutPlanTemplate.id as string;

    const probe = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-schedule`)
      .query({ from: '2026-01-01', to: '2026-01-02' })
      .set(clientAuth);
    expect(probe.status).toBe(200);
    const today = probe.body.today as string;
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const yesterday = CalendarDate.create(today).addDays(-1).value;

    const upserted = await supertest(app)
      .put(`/gym-orgs/${gymOrgId}/clients/${client.userId}/workout-schedule`)
      .set(admin)
      .send({
        entries: [
          { date: yesterday, kind: 'TRAINING', morningTemplateId: templateId },
          { date: today, kind: 'TRAINING', morningTemplateId: templateId },
          { date: CalendarDate.create(today).addDays(1).value, kind: 'REST' },
        ],
      });
    expect(upserted.status).toBe(200);
    expect(upserted.body.days).toHaveLength(3);

    const staffGet = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/workout-schedule`)
      .query({ from: yesterday, to: today })
      .set(admin);
    expect(staffGet.status).toBe(200);
    expect(staffGet.body.days).toHaveLength(2);
    // No WORKOUT_PLANS grant by default → no adherence fields
    expect(staffGet.body.days[0].dayDone).toBeUndefined();

    const mineYesterday = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-schedule`)
      .query({ date: yesterday })
      .set(clientAuth);
    expect(mineYesterday.status).toBe(200);
    const yesterdayItemId = mineYesterday.body.days[0].sessions[0].exercises[0].id as string;

    const catchUp = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/my-workout-schedule/items/${yesterdayItemId}/complete`)
      .set(clientAuth);
    expect(catchUp.status).toBe(204);

    const afterCatchUp = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-schedule`)
      .query({ date: yesterday })
      .set(clientAuth);
    expect(afterCatchUp.body.days[0].sessions[0].exercises[0].completed).toBe(true);
    expect(afterCatchUp.body.days[0].dayDone).toBe(true);
    expect(afterCatchUp.body.days[0].adherencePercent).toBe(100);

    const mine = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-schedule`)
      .query({ date: today })
      .set(clientAuth);
    expect(mine.status).toBe(200);
    const itemId = mine.body.days[0].sessions[0].exercises[0].id as string;

    const completed = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/my-workout-schedule/items/${itemId}/complete`)
      .set(clientAuth);
    expect(completed.status).toBe(204);

    const afterComplete = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-workout-schedule`)
      .query({ date: today })
      .set(clientAuth);
    expect(afterComplete.body.days[0].sessions[0].exercises[0].completed).toBe(true);
    expect(afterComplete.body.days[0].dayDone).toBe(true);

    const uncompleted = await supertest(app)
      .delete(`/gym-orgs/${gymOrgId}/my-workout-schedule/items/${itemId}/complete`)
      .set(clientAuth);
    expect(uncompleted.status).toBe(204);
  });
});
