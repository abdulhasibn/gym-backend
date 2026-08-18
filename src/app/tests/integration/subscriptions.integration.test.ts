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

describe('subscriptions HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('lists, updates payment, overrides start, and shows renewals due', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const admin = authHeader(owner.accessToken);

    const listed = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/subscriptions`)
      .set(admin);
    expect(listed.status).toBe(200);
    expect(listed.body.subscriptions.length).toBeGreaterThanOrEqual(1);
    const base = listed.body.subscriptions.find((row: { kind: string }) => row.kind === 'BASE') as {
      id: string;
      paymentStatus: string;
    };
    expect(base.paymentStatus).toBe('paid');

    const paid = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/subscriptions/${base.id}/payment`)
      .set(admin)
      .send({ paymentStatus: 'unpaid' });
    expect(paid.status).toBe(200);
    expect(paid.body.subscription.paymentStatus).toBe('unpaid');

    const startDate = new Date().toISOString().slice(0, 10);
    const started = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/subscriptions/${base.id}/start-override`)
      .set(admin)
      .send({ startDate });
    expect(started.status).toBe(200);
    expect(started.body.subscription.startDate).toBe(startDate);

    const mine = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-subscriptions`)
      .set(authHeader(client.accessToken));
    expect(mine.status).toBe(200);
    expect(mine.body.subscriptions.length).toBeGreaterThanOrEqual(1);

    const renewals = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/subscriptions/renewals-due`)
      .query({ onOrBefore: '2099-12-31' })
      .set(admin);
    expect(renewals.status).toBe(200);
    expect(renewals.body.renewals.total).toBeGreaterThanOrEqual(1);
  });

  it('forbids an admin from using the client my-subscriptions route', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const response = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-subscriptions`)
      .set(authHeader(owner.accessToken));
    expect(response.status).toBe(403);
  });

  it('rejects invalid payment and start-override bodies', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await inviteAndAcceptClient({
      app,
      adminToken: owner.accessToken,
      gymOrgId,
      basePlanId,
    });
    const listed = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/subscriptions`)
      .set(authHeader(owner.accessToken));
    const baseId = listed.body.subscriptions.find((row: { kind: string }) => row.kind === 'BASE')
      .id as string;

    const partial = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/subscriptions/${baseId}/payment`)
      .set(authHeader(owner.accessToken))
      .send({ paymentStatus: 'partial' });
    expect(partial.status).toBe(422);

    const badDate = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/subscriptions/${baseId}/start-override`)
      .set(authHeader(owner.accessToken))
      .send({ startDate: 'not-a-date' });
    expect(badDate.status).toBe(422);
  });
});
