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

const mealsBody = {
  title: 'Cut week',
  meals: [
    {
      mealSlot: 'BREAKFAST',
      items: [
        {
          foodItemId: SEED_FOOD_IDLI_ID,
          servingId: SEED_FOOD_IDLI_PIECE_SERVING_ID,
          quantity: 2,
        },
      ],
    },
  ],
};

describe('diet coaching HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('manages templates, assigns a plan, and completes a prescribed item into the diary', async () => {
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

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/diet-plan-templates`)
      .set(admin)
      .send(mealsBody);
    expect(created.status).toBe(201);
    const templateId = created.body.dietPlanTemplate.id as string;

    const listed = await supertest(app).get(`/gym-orgs/${gymOrgId}/diet-plan-templates`).set(admin);
    expect(listed.status).toBe(200);
    expect(listed.body.dietPlanTemplates.items).toHaveLength(1);

    const got = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/diet-plan-templates/${templateId}`)
      .set(admin);
    expect(got.status).toBe(200);
    expect(got.body.dietPlanTemplate.title).toBe('Cut week');

    const patched = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/diet-plan-templates/${templateId}`)
      .set(admin)
      .send({ ...mealsBody, title: 'Cut week v2' });
    expect(patched.status).toBe(200);
    expect(patched.body.dietPlanTemplate.title).toBe('Cut week v2');

    const duplicated = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/diet-plan-templates/${templateId}/duplicate`)
      .set(admin);
    expect(duplicated.status).toBe(201);
    expect(duplicated.body.dietPlanTemplate.id).not.toBe(templateId);

    const xor = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/clients/${client.userId}/diet-plans`)
      .set(admin)
      .send({ ...mealsBody, templateId });
    expect(xor.status).toBe(422);

    const assigned = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/clients/${client.userId}/diet-plans`)
      .set(admin)
      .send({ templateId });
    expect(assigned.status).toBe(201);
    expect(assigned.body.dietPlan.clonedFromTemplateId).toBe(templateId);

    const staffGet = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/diet-plans`)
      .set(admin);
    expect(staffGet.status).toBe(200);
    expect(staffGet.body.dietPlan.title).toBe('Cut week v2');

    const mine = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-diet-plan`)
      .set(authHeader(client.accessToken));
    expect(mine.status).toBe(200);
    const itemId = mine.body.dietPlan.meals[0].items[0].id as string;

    const completed = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/my-diet-plan/items/${itemId}/complete`)
      .set(authHeader(client.accessToken));
    expect(completed.status).toBe(204);

    const diary = await supertest(app).get('/me/calorie-logs').set(authHeader(client.accessToken));
    expect(diary.status).toBe(200);
    const prescribed = diary.body.calorieLog.slots.flatMap(
      (slot: { items: ReadonlyArray<{ isExtra: boolean }> }) => slot.items,
    );
    expect(prescribed.some((item: { isExtra: boolean }) => item.isExtra === false)).toBe(true);

    const uncompleted = await supertest(app)
      .delete(`/gym-orgs/${gymOrgId}/my-diet-plan/items/${itemId}/complete`)
      .set(authHeader(client.accessToken));
    expect(uncompleted.status).toBe(204);

    await supertest(app)
      .delete(`/gym-orgs/${gymOrgId}/diet-plan-templates/${duplicated.body.dietPlanTemplate.id}`)
      .set(admin)
      .expect(204);
  });

  it('forbids another trainer from reading a template they do not own', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/diet-plan-templates`)
      .set(authHeader(owner.accessToken))
      .send(mealsBody)
      .expect(201);

    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });
    const invite = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' })
      .expect(201);
    await supertest(app)
      .post(`/gym-orgs/staff-invites/${invite.body.staffInvite.id}/accept`)
      .set(authHeader(trainer.accessToken))
      .expect(200);

    const forbidden = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/diet-plan-templates/${created.body.dietPlanTemplate.id}`)
      .set(authHeader(trainer.accessToken));
    expect(forbidden.status).toBe(403);
  });
});
