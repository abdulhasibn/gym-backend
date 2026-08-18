import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  createGymOrg,
  loadIntegrationApp,
  resetLocalDb,
  signupViaOtp,
} from './harness';

describe('membership plans HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('creates, lists, gets, patches, and soft-deletes plans', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const header = authHeader(owner.accessToken);

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .set(header)
      .send({ name: 'Monthly', kind: 'BASE', durationDays: 30, price: 999 });
    expect(created.status).toBe(201);
    expect(created.body.plan).toMatchObject({
      name: 'Monthly',
      kind: 'BASE',
      capability: null,
      durationDays: 30,
      price: 999,
      active: true,
    });
    const planId = created.body.plan.id as string;

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .set(header)
      .send({
        name: 'PT Addon',
        kind: 'ADDON',
        capability: 'TRAINER_COACHING',
        durationDays: 30,
        price: 1500,
      })
      .expect(201);

    const listed = await supertest(app).get(`/gym-orgs/${gymOrgId}/plans`).set(header);
    expect(listed.status).toBe(200);
    expect(listed.body.plans.total).toBe(2);

    const got = await supertest(app).get(`/gym-orgs/${gymOrgId}/plans/${planId}`).set(header);
    expect(got.status).toBe(200);
    expect(got.body.plan.name).toBe('Monthly');

    const patched = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/plans/${planId}`)
      .set(header)
      .send({ name: 'Monthly Plus', durationDays: 30, price: 1099, active: true });
    expect(patched.status).toBe(200);
    expect(patched.body.plan.name).toBe('Monthly Plus');

    await supertest(app).delete(`/gym-orgs/${gymOrgId}/plans/${planId}`).set(header).expect(204);
    await supertest(app).get(`/gym-orgs/${gymOrgId}/plans/${planId}`).set(header).expect(404);
  });

  it('rejects BASE with a capability and ADDON without one', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const header = authHeader(owner.accessToken);

    const baseWithCap = await supertest(app).post(`/gym-orgs/${gymOrgId}/plans`).set(header).send({
      name: 'Bad Base',
      kind: 'BASE',
      capability: 'TRAINER_COACHING',
      durationDays: 30,
      price: 999,
    });
    expect(baseWithCap.status).toBe(422);

    const addonWithout = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .set(header)
      .send({ name: 'Bad Addon', kind: 'ADDON', durationDays: 30, price: 1500 });
    expect(addonWithout.status).toBe(422);
  });

  it('forbids a trainer from writing the plan catalog', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' })
      .expect(201)
      .then(async (created) => {
        await supertest(app)
          .post(`/gym-orgs/staff-invites/${created.body.staffInvite.id}/accept`)
          .set(authHeader(trainer.accessToken))
          .expect(200);
      });

    const response = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/plans`)
      .set(authHeader(trainer.accessToken))
      .send({ name: 'Monthly', kind: 'BASE', durationDays: 30, price: 999 });
    expect(response.status).toBe(403);
  });
});
