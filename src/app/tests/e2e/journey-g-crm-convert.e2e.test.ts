import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  acceptInviteWithGrants,
  authHeader,
  expectActiveMembership,
  listMembers,
  loadIntegrationApp,
  provisionIronCore,
  resetLocalDb,
  signupCharacter,
  uniqueEmail,
} from './harness';

describe('Journey G — CRM convert to ACTIVE member (Fahad)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('CRM-001 / CRM-002: lead convert → PENDING invite → client accept → ACTIVE membership', async () => {
    const iron = await provisionIronCore(app);
    const admin = authHeader(iron.owner.accessToken);
    const fahadEmail = uniqueEmail('fahad');

    const created = await supertest(app)
      .post(`/gym-orgs/${iron.gymOrgId}/leads`)
      .set(admin)
      .send({
        name: 'Fahad Noor',
        phone: '9876501234',
        email: fahadEmail,
        source: 'walk-in',
        interest: 'personal training',
        notes: 'Asked about PT package',
      });
    expect(created.status).toBe(201);
    expect(created.body.lead.status).toBe('NEW');
    const leadId = created.body.lead.id as string;

    const leadsList = await supertest(app).get(`/gym-orgs/${iron.gymOrgId}/leads`).set(admin);
    expect(leadsList.status).toBe(200);
    expect(leadsList.body.leads.total).toBeGreaterThanOrEqual(1);

    for (const status of ['CONTACTED', 'TRIAL'] as const) {
      const moved = await supertest(app)
        .patch(`/gym-orgs/${iron.gymOrgId}/leads/${leadId}/status`)
        .set(admin)
        .send({ status });
      expect(moved.status).toBe(200);
      expect(moved.body.lead.status).toBe(status);
    }

    await supertest(app)
      .patch(`/gym-orgs/${iron.gymOrgId}/leads/${leadId}`)
      .set(admin)
      .send({
        name: 'Fahad Noor',
        phone: '9876501234',
        email: fahadEmail,
        followUpDate: '2099-02-01',
      })
      .expect(200);

    const due = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/leads/due-follow-ups`)
      .query({ onOrBefore: '2099-12-31' })
      .set(admin);
    expect(due.status).toBe(200);
    expect(due.body.leads.total).toBeGreaterThanOrEqual(1);

    const converted = await supertest(app)
      .post(`/gym-orgs/${iron.gymOrgId}/leads/${leadId}/convert`)
      .set(admin)
      .send({
        basePlanId: iron.basePlanId,
        basePaymentStatus: 'unpaid',
        addonPlanId: iron.addonPlanId,
        addonPaymentStatus: 'unpaid',
      });
    expect(converted.status).toBe(201);
    expect(converted.body.lead.status).toBe('CONVERTED');
    expect(converted.body.membershipInvite.status).toBe('PENDING');
    expect(converted.body.membershipInvite.invitedEmail).toBe(fahadEmail);
    const inviteId = converted.body.membershipInvite.id as string;

    expect((await listMembers(iron)).filter((row) => row.status === 'ACTIVE')).toHaveLength(0);

    const fahad = await signupCharacter(app, {
      lane: 'CLIENT',
      name: 'Fahad Noor',
      email: fahadEmail,
    });

    const inbox = await supertest(app)
      .get('/membership-invites/inbox')
      .set(authHeader(fahad.accessToken));
    expect(inbox.status).toBe(200);
    expect(inbox.body.membershipInvites.items.some((item: { id: string }) => item.id === inviteId)).toBe(
      true,
    );

    const accepted = await acceptInviteWithGrants(iron, {
      client: fahad,
      inviteId,
      optionalClassGrants: ['PROGRESS'],
    });
    expect(accepted.status).toBe(200);

    await expectActiveMembership(iron, fahad, {
      expectAddon: true,
      flowId: 'CRM-002',
    });

    const leadAfter = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/leads/${leadId}`)
      .set(admin);
    expect(leadAfter.status).toBe(200);
    expect(leadAfter.body.lead.status).toBe('CONVERTED');
    expect(leadAfter.body.lead.convertedMembershipInviteId).toBe(inviteId);
  });
});
