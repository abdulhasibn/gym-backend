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

describe('leads HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('creates, gets, patches, lists due follow-ups, and soft-deletes a lead', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const header = authHeader(owner.accessToken);

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .set(header)
      .send({ name: 'Walk-in', phone: '9876543210', source: 'desk' });
    expect(created.status).toBe(201);
    expect(created.body.lead).toMatchObject({
      name: 'Walk-in',
      phone: '9876543210',
      status: 'NEW',
    });
    expect(created.body.warnings).toEqual([]);
    const leadId = created.body.lead.id as string;

    const got = await supertest(app).get(`/gym-orgs/${gymOrgId}/leads/${leadId}`).set(header);
    expect(got.status).toBe(200);
    expect(got.body.lead.id).toBe(leadId);

    const status = await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/leads/${leadId}/status`)
      .set(header)
      .send({ status: 'CONTACTED' });
    expect(status.status).toBe(200);
    expect(status.body.lead.status).toBe('CONTACTED');

    await supertest(app)
      .patch(`/gym-orgs/${gymOrgId}/leads/${leadId}`)
      .set(header)
      .send({
        name: 'Walk-in',
        phone: '9876543210',
        followUpDate: '2099-01-15',
      })
      .expect(200);

    const due = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/leads/due-follow-ups`)
      .query({ onOrBefore: '2099-12-31' })
      .set(header);
    expect(due.status).toBe(200);
    expect(due.body.leads.total).toBe(1);

    await supertest(app).delete(`/gym-orgs/${gymOrgId}/leads/${leadId}`).set(header).expect(204);
    await supertest(app).get(`/gym-orgs/${gymOrgId}/leads/${leadId}`).set(header).expect(404);
  });

  it('warns on a duplicate open phone without blocking create', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const header = authHeader(owner.accessToken);

    await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .set(header)
      .send({ name: 'First', phone: '9876543210' })
      .expect(201);

    const second = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .set(header)
      .send({ name: 'Second', phone: '9876543210' });
    expect(second.status).toBe(201);
    expect(second.body.warnings.length).toBeGreaterThan(0);
  });

  it('converts a lead with stored email and rejects a second convert', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const header = authHeader(owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .set(header)
      .send({ name: 'Priya', phone: '9876543210', email: 'priya.convert@gym.test' });
    expect(created.status).toBe(201);
    expect(created.body.lead.email).toBe('priya.convert@gym.test');
    const leadId = created.body.lead.id as string;

    const converted = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${leadId}/convert`)
      .set(header)
      .send({ basePlanId, basePaymentStatus: 'paid' });
    expect(converted.status).toBe(201);
    expect(converted.body.lead.status).toBe('CONVERTED');
    expect(converted.body.membershipInvite.status).toBe('PENDING');
    expect(converted.body.membershipInvite.invitedEmail).toBe('priya.convert@gym.test');
    expect(converted.body.membershipInvite.inviteePhone).toBe('9876543210');

    const listed = await supertest(app)
      .get(`/gym-orgs/${gymOrgId}/membership-invites`)
      .set(header);
    expect(listed.status).toBe(200);
    expect(listed.body.membershipInvites.items.some((item: { id: string }) => item.id === converted.body.membershipInvite.id)).toBe(
      true,
    );

    const second = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${leadId}/convert`)
      .set(header)
      .send({ basePlanId, basePaymentStatus: 'paid' });
    expect(second.status).toBe(409);
  });

  it('converts a lead without stored email when invitedEmail is supplied', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const header = authHeader(owner.accessToken);
    const { basePlanId } = await createBaseAndAddonPlans(app, owner.accessToken, gymOrgId);

    const created = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .set(header)
      .send({ name: 'Walk-in', phone: '9876543210' });
    expect(created.status).toBe(201);
    expect(created.body.lead.email).toBeNull();

    const converted = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads/${created.body.lead.id}/convert`)
      .set(header)
      .send({
        invitedEmail: 'walkin.convert@gym.test',
        basePlanId,
        basePaymentStatus: 'unpaid',
      });
    expect(converted.status).toBe(201);
    expect(converted.body.lead.email).toBe('walkin.convert@gym.test');
    expect(converted.body.lead.status).toBe('CONVERTED');
  });

  it('forbids a trainer from creating a lead', async () => {
    const owner = await signupViaOtp(app, { lane: 'STAFF', name: 'Owner Admin' });
    const gymOrgId = await createGymOrg(app, owner.accessToken);
    const trainer = await signupViaOtp(app, { lane: 'STAFF', name: 'Ada Trainer' });
    const invite = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/staff-invites`)
      .set(authHeader(owner.accessToken))
      .send({ staffCode: trainer.staffCode, targetRole: 'TRAINER' });
    await supertest(app)
      .post(`/gym-orgs/staff-invites/${invite.body.staffInvite.id}/accept`)
      .set(authHeader(trainer.accessToken))
      .expect(200);

    const response = await supertest(app)
      .post(`/gym-orgs/${gymOrgId}/leads`)
      .set(authHeader(trainer.accessToken))
      .send({ name: 'Walk-in', phone: '9876543210' });
    expect(response.status).toBe(403);
  });
});
