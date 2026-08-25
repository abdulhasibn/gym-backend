import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  assignTrainerToMember,
  authHeader,
  clientCheckIn,
  inviteAndAcceptTrainer,
  listClientSubscriptions,
  listMembers,
  loadIntegrationApp,
  markSubscriptionPayment,
  offboardMember,
  onboardClient,
  provisionIronCore,
  resetLocalDb,
  setCheckInBlock,
  SEED_FOOD_IDLI_ID,
  SEED_FOOD_IDLI_PIECE_SERVING_ID,
} from './harness';

describe('Journey H — Billing, block, and offboard access (Sameer)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('SUB-001 / ATTEND-001: unpaid Base still allows check-in (payment ≠ entitlement)', async () => {
    const iron = await provisionIronCore(app);
    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      basePaymentStatus: 'unpaid',
      includeAddon: false,
    });

    const subscriptions = await listClientSubscriptions(iron, sameer.client.userId);
    const base = subscriptions.find((row) => row.kind === 'BASE');
    expect(base?.paymentStatus).toBe('unpaid');

    const checkIn = await clientCheckIn(iron, sameer.client);
    expect(checkIn.status, 'SUB-001: unpaid in-date member must still check in').toBe(201);
  });

  it('SUB-002: unpaid Trainer addon still allows diet coaching while in-date', async () => {
    const iron = await provisionIronCore(app);
    const trainer = await inviteAndAcceptTrainer(iron, 'Rizwan Ali');
    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      basePaymentStatus: 'paid',
      includeAddon: true,
      addonPaymentStatus: 'unpaid',
    });

    const subscriptions = await listClientSubscriptions(iron, sameer.client.userId);
    const addon = subscriptions.find((row) => row.kind === 'ADDON');
    expect(addon?.paymentStatus).toBe('unpaid');

    await assignTrainerToMember(iron, sameer.membershipId, trainer.trainerProfileId);

    const diet = await supertest(app)
      .post(`/gym-orgs/${iron.gymOrgId}/clients/${sameer.client.userId}/diet-plans`)
      .set(authHeader(trainer.session.accessToken))
      .send({
        title: 'Unpaid but entitled',
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
      });
    expect(diet.status, 'SUB-002: unpaid in-date addon must still allow coaching write').toBe(201);
  });

  it('BLOCK-001: paid+blocked fails check-in; unpaid+unblocked succeeds', async () => {
    const iron = await provisionIronCore(app);
    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      basePaymentStatus: 'paid',
      includeAddon: false,
    });

    await setCheckInBlock(iron, sameer.membershipId, true);
    const blocked = await clientCheckIn(iron, sameer.client);
    expect(blocked.status).toBeGreaterThanOrEqual(400);

    await setCheckInBlock(iron, sameer.membershipId, false);

    const subscriptions = await listClientSubscriptions(iron, sameer.client.userId);
    const base = subscriptions.find((row) => row.kind === 'BASE');
    expect(base).toBeDefined();
    await markSubscriptionPayment(iron, base!.id, 'unpaid');

    const afterUnpaid = await listClientSubscriptions(iron, sameer.client.userId);
    expect(afterUnpaid.find((row) => row.kind === 'BASE')?.paymentStatus).toBe('unpaid');

    const checkIn = await clientCheckIn(iron, sameer.client);
    expect(checkIn.status, 'BLOCK-001: unpaid + unblocked must check in').toBe(201);
  });

  it('SUB-003 / OFFBOARD-001: payment update, renewals-due, offboard keeps attendance history', async () => {
    const iron = await provisionIronCore(app);
    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      basePaymentStatus: 'unpaid',
      includeAddon: false,
    });
    const admin = authHeader(iron.owner.accessToken);

    const subscriptions = await listClientSubscriptions(iron, sameer.client.userId);
    const base = subscriptions.find((row) => row.kind === 'BASE');
    expect(base).toBeDefined();

    await markSubscriptionPayment(iron, base!.id, 'partial', 500);
    const afterPartial = await listClientSubscriptions(iron, sameer.client.userId);
    expect(afterPartial.find((row) => row.kind === 'BASE')?.paymentStatus).toBe('partial');

    await markSubscriptionPayment(iron, base!.id, 'paid');

    const startDate = new Date().toISOString().slice(0, 10);
    const started = await supertest(app)
      .post(`/gym-orgs/${iron.gymOrgId}/subscriptions/${base!.id}/start-override`)
      .set(admin)
      .send({ startDate });
    expect(started.status).toBe(200);
    expect(started.body.subscription.startDate).toBe(startDate);

    const renewals = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/subscriptions/renewals-due`)
      .query({ onOrBefore: '2099-12-31' })
      .set(admin);
    expect(renewals.status).toBe(200);
    expect(renewals.body.renewals.total).toBeGreaterThanOrEqual(1);

    const firstCheckIn = await clientCheckIn(iron, sameer.client);
    expect(firstCheckIn.status).toBe(201);

    await offboardMember(iron, sameer.membershipId);

    const activeRoster = await listMembers(iron, 'ACTIVE');
    expect(
      activeRoster.filter((row) => row.clientUserId === sameer.client.userId),
    ).toHaveLength(0);
    const inactiveRoster = await listMembers(iron, 'INACTIVE');
    expect(
      inactiveRoster.some(
        (row) => row.clientUserId === sameer.client.userId && row.status === 'INACTIVE',
      ),
    ).toBe(true);

    const history = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/attendances/clients/${sameer.client.userId}`)
      .set(admin);
    expect(history.status).toBe(200);
    expect(history.body.attendances.total).toBeGreaterThanOrEqual(1);

    const billing = await listClientSubscriptions(iron, sameer.client.userId);
    expect(billing.length).toBeGreaterThanOrEqual(1);

    const deniedCheckIn = await clientCheckIn(iron, sameer.client);
    expect(deniedCheckIn.status).toBeGreaterThanOrEqual(400);
  });
});
