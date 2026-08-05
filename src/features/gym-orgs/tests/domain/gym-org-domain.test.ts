import { describe, expect, it } from 'vitest';

import { toUserId } from '../../../../domain/shared/user-id';
import { GymOrg } from '../../domain/gym-org.entity';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { StaffCode } from '../../domain/staff-code.value-object';
import { StaffInvite } from '../../domain/staff-invite.entity';
import { toStaffInviteId } from '../../domain/staff-invite-id';
import { StaffInviteInvalidTransitionError } from '../../domain/staff-invite-invalid-transition.error';

describe('Gym organization value objects', () => {
  it('normalizes a gym organization name', () => {
    expect(GymOrgName.create('  North Star Fitness  ').value).toBe('North Star Fitness');
  });

  it('rejects blank and oversized gym organization names', () => {
    expect(() => GymOrgName.create('   ')).toThrow('cannot be empty');
    expect(() => GymOrgName.create('a'.repeat(256))).toThrow('cannot exceed 255 characters');
  });

  it('accepts IANA timezones and rejects invalid values', () => {
    expect(IanaTimezone.create('Asia/Kolkata').value).toBe('Asia/Kolkata');
    expect(() => IanaTimezone.create('India/Delhi')).toThrow('valid IANA timezone');
  });

  it('rejects blank staff codes', () => {
    expect(() => StaffCode.create('   ')).toThrow('cannot be empty');
  });
});

describe('GymOrg.updateProfile', () => {
  it('updates profile fields and rejects blank address', () => {
    const gymOrg = GymOrg.reconstitute({
      id: toGymOrgId('11111111-1111-4111-8111-111111111111'),
      name: GymOrgName.create('Old'),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
      ownerUserId: toUserId('22222222-2222-4222-8222-222222222222'),
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    gymOrg.updateProfile(
      {
        name: GymOrgName.create('New Name'),
        address: '12 Main St',
        contactPhone: null,
        contactEmail: 'desk@example.com',
        logoUrl: null,
        timezone: IanaTimezone.create('Asia/Kolkata'),
      },
      new Date('2026-08-04T00:00:00.000Z'),
    );

    expect(gymOrg.name.value).toBe('New Name');
    expect(gymOrg.address).toBe('12 Main St');
    expect(gymOrg.contactEmail).toBe('desk@example.com');
    expect(gymOrg.updatedAt.toISOString()).toBe('2026-08-04T00:00:00.000Z');

    expect(() =>
      gymOrg.updateProfile(
        {
          name: GymOrgName.create('X'),
          address: '   ',
          contactPhone: null,
          contactEmail: null,
          logoUrl: null,
          timezone: IanaTimezone.create('Asia/Kolkata'),
        },
        new Date(),
      ),
    ).toThrow('address cannot be blank');
  });
});

describe('StaffInvite transitions', () => {
  const base = {
    id: toStaffInviteId('33333333-3333-4333-8333-333333333333'),
    gymOrgId: toGymOrgId('11111111-1111-4111-8111-111111111111'),
    invitedUserId: toUserId('44444444-4444-4444-8444-444444444444'),
    targetRole: 'TRAINER' as const,
    expiresAt: new Date('2026-08-18T00:00:00.000Z'),
    createdBy: toUserId('22222222-2222-4222-8222-222222222222'),
    now: new Date('2026-08-04T00:00:00.000Z'),
  };

  it('creates pending invites and accepts / revokes / expires from pending', () => {
    const invite = StaffInvite.create(base);
    expect(invite.status).toBe('PENDING');

    invite.assertAcceptableBy(base.invitedUserId, base.now);
    invite.markAccepted(base.now);
    expect(invite.status).toBe('ACCEPTED');

    const revocable = StaffInvite.create({
      ...base,
      id: toStaffInviteId('33333333-3333-4333-8333-333333333334'),
    });
    revocable.revoke(base.now);
    expect(revocable.status).toBe('REVOKED');

    const expirable = StaffInvite.create({
      ...base,
      id: toStaffInviteId('33333333-3333-4333-8333-333333333335'),
    });
    expirable.markExpired(base.now);
    expect(expirable.status).toBe('EXPIRED');
  });

  it('rejects invalid transitions and wrong invitee', () => {
    const invite = StaffInvite.create(base);
    invite.revoke(base.now);

    expect(() => invite.markAccepted(base.now)).toThrow(StaffInviteInvalidTransitionError);
    expect(() =>
      StaffInvite.create(base).assertAcceptableBy(
        toUserId('55555555-5555-4555-8555-555555555555'),
        base.now,
      ),
    ).toThrow(StaffInviteInvalidTransitionError);
  });
});
