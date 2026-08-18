import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeader,
  createBaseAndAddonPlans,
  createGymOrg,
  loadIntegrationApp,
  resetLocalDb,
  signupViaOtp,
} from './harness';

describe('membership join and data grants HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('lets a client accept an invite and read then update data grants', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId, addonPlanId } = await createBaseAndAddonPlans(
      app,
      owner.accessToken,
      gymOrgId,
    );
    const client = await signupViaOtp(app, { lane: 'CLIENT', name: 'Alex Client' });

    const invite = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .set(authHeader(owner.accessToken))
      .send({
        inviteeName: 'Alex Client',
        invitedEmail: client.email,
        basePlanId,
        basePaymentStatus: 'paid',
        addonPlanId,
        addonPaymentStatus: 'paid',
      });
    expect(invite.status).toBe(201);
    const inviteId = invite.body.membershipInvite.id as string;

    const listed = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/membership-invites`)
      .set(authHeader(owner.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.membershipInvites.total).toBe(1);

    const inbox = await supertest(app)
      .get('/membership-invites/inbox')
      .set(authHeader(client.accessToken));
    expect(inbox.status).toBe(200);
    expect(inbox.body.membershipInvites.total).toBe(1);

    const accepted = await supertest(app)
      .post(`/membership-invites/${inviteId}/accept`)
      .set(authHeader(client.accessToken))
      .send({
        optionalProfileAttributes: ['GENDER'],
        optionalClassGrants: ['PROGRESS'],
      });
    expect(accepted.status).toBe(200);
    expect(accepted.body.membershipInvite.status).toBe('ACCEPTED');
    expect(accepted.body.grants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'GENDER']),
    );

    const grants = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/my-data-grants`)
      .set(authHeader(client.accessToken));
    expect(grants.status).toBe(200);
    expect(grants.body.dataGrants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'GENDER']),
    );
    expect(grants.body.dataGrants.classGrants).toContain('PROGRESS');

    const updated = await supertest(app)
      .put(`/gym-orgs/${gymOrgId}/my-data-grants`)
      .set(authHeader(client.accessToken))
      .send({
        optionalProfileAttributes: ['MEDICAL_NOTES'],
        optionalClassGrants: ['CALORIES'],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.dataGrants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT', 'MEDICAL_NOTES']),
    );
    expect(updated.body.dataGrants.classGrants).toContain('CALORIES');
    expect(updated.body.dataGrants.classGrants).not.toContain('PROGRESS');
  });

  it('rejects a second accept of the same invite', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await signupViaOtp(app, { lane: 'CLIENT', name: 'Alex Client' });

    const invite = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .set(authHeader(owner.accessToken))
      .send({
        inviteeName: 'Alex Client',
        invitedEmail: client.email,
        basePlanId,
        basePaymentStatus: 'unpaid',
      })
      .expect(201);

    await supertest(app)
      .post(`/membership-invites/${invite.body.membershipInvite.id}/accept`)
      .set(authHeader(client.accessToken))
      .send({ optionalProfileAttributes: [], optionalClassGrants: [] })
      .expect(200);

    const second = await supertest(app)
      .post(`/membership-invites/${invite.body.membershipInvite.id}/accept`)
      .set(authHeader(client.accessToken))
      .send({ optionalProfileAttributes: [], optionalClassGrants: [] });
    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.status).toBeLessThan(500);
  });

  it('forbids a client from reading grants at another gym', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const otherOwner = await signupViaOtp(app, { lane: 'STAFF', name: 'Other Owner' });
    const otherGymId = await createGymOrg(app, otherOwner.accessToken, 'Other Gym');
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);
    const client = await signupViaOtp(app, { lane: 'CLIENT', name: 'Alex Client' });

    const invite = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/membership-invites`)
      .set(authHeader(owner.accessToken))
      .send({
        inviteeName: 'Alex Client',
        invitedEmail: client.email,
        basePlanId,
        basePaymentStatus: 'unpaid',
      })
      .expect(201);
    await supertest(app)
      .post(`/membership-invites/${invite.body.membershipInvite.id}/accept`)
      .set(authHeader(client.accessToken))
      .send({ optionalProfileAttributes: [], optionalClassGrants: [] })
      .expect(200);

    const response = await supertest(app)
      .get(`/gym-orgs/${otherGymId}/my-data-grants`)
      .set(authHeader(client.accessToken));
    expect(response.status).toBe(404);
  });
});
