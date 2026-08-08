import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { InviteeEmail } from '../../domain/invitee-email.value-object';
import { InviteeName } from '../../domain/invitee-name.value-object';
import { MembershipInvite } from '../../domain/membership-invite.entity';
import { MembershipInviteInvalidTransitionError } from '../../domain/membership-invite-invalid-transition.error';
import { toMembershipInviteId } from '../../domain/membership-invite-id';
import { toMembershipPlanId } from '../../domain/membership-plan-id';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const basePlanId = toMembershipPlanId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const adminId = toUserId('11111111-1111-4111-8111-111111111111');
const now = new Date('2026-08-08T00:00:00.000Z');

function createPending(): MembershipInvite {
  return MembershipInvite.create({
    id: toMembershipInviteId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
    gymOrgId,
    invitedEmail: InviteeEmail.create('client@example.com'),
    invitedUserId: null,
    inviteeName: InviteeName.create('Alex'),
    inviteePhone: null,
    basePlanId,
    basePaymentStatus: 'unpaid',
    addonPlanId: null,
    addonPaymentStatus: null,
    expiresAt: new Date('2026-08-22T00:00:00.000Z'),
    createdBy: adminId,
    now,
  });
}

describe('MembershipInvite domain', () => {
  it('creates as PENDING', () => {
    const invite = createPending();
    expect(invite.status).toBe('PENDING');
    expect(invite.invitedEmail.value).toBe('client@example.com');
    expect(invite.acceptedAt).toBeNull();
  });

  it('revokes from PENDING', () => {
    const invite = createPending();
    invite.revoke(new Date('2026-08-09T00:00:00.000Z'));
    expect(invite.status).toBe('REVOKED');
  });

  it('rejects revoke when not PENDING', () => {
    const invite = createPending();
    invite.revoke(now);
    expect(() => invite.revoke(now)).toThrow(MembershipInviteInvalidTransitionError);
  });

  it('rejects mismatched addon payment pair', () => {
    expect(() =>
      MembershipInvite.create({
        id: toMembershipInviteId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        gymOrgId,
        invitedEmail: InviteeEmail.create('client@example.com'),
        invitedUserId: null,
        inviteeName: InviteeName.create('Alex'),
        inviteePhone: null,
        basePlanId,
        basePaymentStatus: 'unpaid',
        addonPlanId: toMembershipPlanId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
        addonPaymentStatus: null,
        expiresAt: new Date('2026-08-22T00:00:00.000Z'),
        createdBy: adminId,
        now,
      }),
    ).toThrow(/both be set or both be null/);
  });
});
