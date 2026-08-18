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

async function acceptTrainer(
  app: Express,
  ownerToken: string,
  gymOrgId: string,
): Promise<{ trainerToken: string; trainerProfileId: string }> {
  const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });
  const invite = await supertest(app)
    .post(`/gym-orgs/${gymOrgId}/staff-invites`)
    .set(authHeader(ownerToken))
    .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' })
    .expect(201);
  await supertest(app)
    .post(`/gym-orgs/staff-invites/${invite.body.staffInvite.id}/accept`)
    .set(authHeader(trainer.accessToken))
    .expect(200);
  const trainers = await supertest(app)
    .get(`/gym-orgs/${gymOrgId}/trainers`)
    .set(authHeader(ownerToken))
    .expect(200);
  const profile = trainers.body.trainers.items.find(
    (row: { userId: string }) => row.userId === trainer.userId,
  ) as { trainerProfileId: string };
  return { trainerToken: trainer.accessToken, trainerProfileId: profile.trainerProfileId };
}

describe('roster HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('assigns a trainer, lists assigned members, blocks check-in, then offboards', async () => {
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
    const { trainerToken, trainerProfileId } = await acceptTrainer(
      app,
      owner.accessToken,
      gymOrgId,
    );
    const admin = authHeader(owner.accessToken);

    const members = await supertest(app).get(`/gym-orgs/${gymOrgId}/members`).set(admin);
    expect(members.status).toBe(200);
    expect(members.body.members).toHaveLength(1);
    const membershipId = members.body.members[0].membershipId as string;

    const assigned = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/members/${membershipId}/assign-trainer`)
      .set(admin)
      .send({ trainerProfileId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.membership.assignedTrainerId).toBe(trainerProfileId);

    const mine = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-assigned-members`)
      .set(authHeader(trainerToken));
    expect(mine.status).toBe(200);
    expect(mine.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ membershipId, clientUserId: client.userId }),
      ]),
    );

    const blocked = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/members/${membershipId}/check-in-block`)
      .set(admin)
      .send({ blocked: true });
    expect(blocked.status).toBe(200);
    expect(blocked.body.membership.checkInBlocked).toBe(true);

    const checkIn = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/check-in`)
      .set(authHeader(client.accessToken));
    expect(checkIn.status).toBeGreaterThanOrEqual(400);

    await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/members/${membershipId}/check-in-block`)
      .set(admin)
      .send({ blocked: false })
      .expect(200);

    const offboarded = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/members/${membershipId}/offboard`)
      .set(admin);
    expect(offboarded.status).toBe(200);
    expect(offboarded.body.membership.status).toBe('INACTIVE');

    const profile = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/clients/${client.userId}/profile`)
      .set(admin);
    expect(profile.status).toBe(403);
  });

  it('forbids a trainer from listing the admin roster', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { trainerToken } = await acceptTrainer(app, owner.accessToken, gymOrgId);

    const response = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/members`)
      .set(authHeader(trainerToken));
    expect(response.status).toBe(403);
  });
});
