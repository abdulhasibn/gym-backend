import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  acceptInviteWithGrants,
  authHeader,
  createMembershipInvite,
  expectActiveMembership,
  listMembers,
  loadIntegrationApp,
  onboardClient,
  provisionIronCore,
  provisionTitan,
  resetLocalDb,
  signupCharacter,
} from './harness';

describe('Journey B — Client onboarding (Sameer)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('INVITE-001 / MEMBER-001 / GRANT-001: Sameer accept → ACTIVE + BASE/ADDON snapshots + grants', async () => {
    const iron = await provisionIronCore(app);
    const sameer = await signupCharacter(app, { lane: 'CLIENT', name: 'Sameer Rahman' });

    const invite = await createMembershipInvite(iron, {
      client: sameer,
      inviteeName: 'Sameer Rahman',
      basePaymentStatus: 'paid',
      includeAddon: true,
      addonPaymentStatus: 'paid',
    });
    expect(invite.status).toBe('PENDING');

    const listed = await supertest(app)
      .get(`/gym-orgs/${iron.gymOrgId}/membership-invites`)
      .set(authHeader(iron.owner.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.membershipInvites.total).toBe(1);

    const beforeAccept = await listMembers(iron);
    expect(beforeAccept.filter((row) => row.status === 'ACTIVE')).toHaveLength(0);

    const inbox = await supertest(app)
      .get('/membership-invites/inbox')
      .set(authHeader(sameer.accessToken));
    expect(inbox.status).toBe(200);
    expect(inbox.body.membershipInvites.total).toBe(1);

    const accepted = await acceptInviteWithGrants(iron, {
      client: sameer,
      inviteId: invite.inviteId,
      optionalProfileAttributes: [],
      optionalClassGrants: ['PROGRESS', 'CALORIES', 'WEARABLES', 'DIET_PLANS', 'WORKOUT_PLANS'],
    });
    expect(accepted.status).toBe(200);

    await expectActiveMembership(iron, sameer, {
      expectAddon: true,
      flowId: 'MEMBER-001',
    });

    const grants = (
      accepted.body as {
        grants: { profileAttributes: string[]; classGrants: string[] };
      }
    ).grants;
    expect(grants.profileAttributes).toEqual(
      expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT']),
    );
    expect(grants.classGrants).toEqual(
      expect.arrayContaining([
        'PROGRESS',
        'CALORIES',
        'WEARABLES',
        'DIET_PLANS',
        'WORKOUT_PLANS',
      ]),
    );
    expect(grants.classGrants).not.toContain('MEDICAL_NOTES');
  });

  it('MEMBER-002: duplicate accept of the same invite does not create a second membership', async () => {
    const iron = await provisionIronCore(app);
    const onboarded = await onboardClient(iron, {
      name: 'Sameer Rahman',
      optionalClassGrants: ['PROGRESS'],
    });

    const second = await acceptInviteWithGrants(iron, {
      client: onboarded.client,
      inviteId: onboarded.inviteId,
    });
    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.status).toBeLessThan(500);

    const active = (await listMembers(iron)).filter(
      (row) => row.clientUserId === onboarded.client.userId && row.status === 'ACTIVE',
    );
    expect(active).toHaveLength(1);
  });

  it('MEMBER-010: Staff email cannot receive a membership invite (wrong lane)', async () => {
    const iron = await provisionIronCore(app);
    const staff = await signupCharacter(app, { lane: 'STAFF', name: 'Imran Sheikh' });

    const invite = await supertest(app)
      .post(`/gym-orgs/${iron.gymOrgId}/membership-invites`)
      .set(authHeader(iron.owner.accessToken))
      .send({
        inviteeName: 'Imran Sheikh',
        invitedEmail: staff.email,
        basePlanId: iron.basePlanId,
        basePaymentStatus: 'paid',
      });
    expect(invite.status).toBe(422);
    expect(invite.body.error.code).toBe('INVALID_MEMBERSHIP_INVITEE');

    const members = await listMembers(iron);
    expect(members).toHaveLength(0);
  });

  it('MEMBER-010b: Staff session cannot accept a client membership invite', async () => {
    const iron = await provisionIronCore(app);
    const sameer = await signupCharacter(app, { lane: 'CLIENT', name: 'Sameer Rahman' });
    const staff = await signupCharacter(app, { lane: 'STAFF', name: 'Imran Sheikh' });
    const invite = await createMembershipInvite(iron, {
      client: sameer,
      inviteeName: 'Sameer Rahman',
      includeAddon: false,
    });

    const response = await acceptInviteWithGrants(iron, {
      client: staff,
      inviteId: invite.inviteId,
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const members = await listMembers(iron);
    expect(members).toHaveLength(0);
  });

  it('MEMBER-011: Client with ACTIVE membership cannot accept a second gym invite', async () => {
    const iron = await provisionIronCore(app);
    const titan = await provisionTitan(app);
    const sameer = await onboardClient(iron, {
      name: 'Sameer Rahman',
      includeAddon: true,
    });

    const titanInvite = await createMembershipInvite(titan, {
      client: sameer.client,
      inviteeName: 'Sameer Rahman',
      includeAddon: false,
    });

    const response = await acceptInviteWithGrants(titan, {
      client: sameer.client,
      inviteId: titanInvite.inviteId,
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const ironActive = (await listMembers(iron)).filter(
      (row) => row.clientUserId === sameer.client.userId && row.status === 'ACTIVE',
    );
    expect(ironActive).toHaveLength(1);

    const titanMembers = await listMembers(titan);
    expect(
      titanMembers.filter(
        (row) => row.clientUserId === sameer.client.userId && row.status === 'ACTIVE',
      ),
    ).toHaveLength(0);
  });
});
