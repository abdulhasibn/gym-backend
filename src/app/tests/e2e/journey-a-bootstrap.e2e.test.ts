import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  IRONCORE_ADDON_PLAN,
  IRONCORE_BASE_PLAN,
  IRONCORE_NAME,
  inviteAndAcceptTrainer,
  loadIntegrationApp,
  provisionIronCore,
  resetLocalDb,
  signupCharacter,
} from './harness';

describe('Journey A — Gym bootstrap (IronCore)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('AUTH-001 / GYM-001 / PLAN-001 / PLAN-002 / STAFF-001: Arif stands up IronCore with Rizwan as trainer', async () => {
    const world = await provisionIronCore(app);

    const me = await supertest(app).get('/auth/me').set(authHeader(world.owner.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({
      id: world.owner.userId,
      lane: 'STAFF',
      roleCode: 'ADMIN',
      name: 'Arif Khan',
    });

    const gym = await supertest(app)
      .get(`/gym-orgs/${world.gymOrgId}`)
      .set(authHeader(world.owner.accessToken));
    expect(gym.status).toBe(200);
    expect(gym.body.gymOrg.name).toBe(IRONCORE_NAME);

    const plans = await supertest(app)
      .get(`/gym-orgs/${world.gymOrgId}/plans`)
      .set(authHeader(world.owner.accessToken));
    expect(plans.status).toBe(200);
    expect(plans.body.plans.total).toBe(2);
    expect(plans.body.plans.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: world.basePlanId,
          name: IRONCORE_BASE_PLAN.name,
          kind: 'BASE',
          price: IRONCORE_BASE_PLAN.price,
          durationDays: 30,
        }),
        expect.objectContaining({
          id: world.addonPlanId,
          name: IRONCORE_ADDON_PLAN.name,
          kind: 'ADDON',
          capability: 'TRAINER_COACHING',
          price: IRONCORE_ADDON_PLAN.price,
        }),
      ]),
    );

    const rizwan = await inviteAndAcceptTrainer(world, 'Rizwan Ali');
    const rizwanMe = await supertest(app)
      .get('/auth/me')
      .set(authHeader(rizwan.session.accessToken));
    expect(rizwanMe.status).toBe(200);
    expect(rizwanMe.body.user.roleCode).toBe('TRAINER');

    const trainers = await supertest(app)
      .get(`/gym-orgs/${world.gymOrgId}/trainers`)
      .set(authHeader(world.owner.accessToken));
    expect(trainers.status).toBe(200);
    expect(trainers.body.trainers.items.map((row: { userId: string }) => row.userId)).toEqual(
      expect.arrayContaining([world.owner.userId, rizwan.session.userId]),
    );
  });

  it('GYM-010: Client lane cannot create a gym', async () => {
    const sameer = await signupCharacter(app, { lane: 'CLIENT', name: 'Sameer Rahman' });
    const response = await supertest(app)
      .post('/gym-orgs')
      .set(authHeader(sameer.accessToken))
      .send({ name: 'Rogue Gym', timezone: 'Asia/Kolkata' });
    expect(response.status).toBe(403);
  });
});
