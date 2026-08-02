import { describe, expect, it } from 'vitest';

import { AccountLane } from '../../domain/account-lane.value-object';
import { AuthUserInvariantError } from '../../domain/auth-user-invariant.error';
import { EmailAddressInvalidError } from '../../domain/email-address.error';
import { EmailAddress } from '../../domain/email-address.value-object';
import { InvalidAccountLaneError } from '../../domain/invalid-account-lane.error';
import { AuthUser, toAuthUserId } from '../../domain/user.entity';

describe('auth domain value objects', () => {
  it('normalizes email addresses and rejects malformed addresses', () => {
    expect(EmailAddress.create('  Member@Example.COM ').value).toBe('member@example.com');
    expect(() => EmailAddress.create('not-an-email')).toThrow(EmailAddressInvalidError);
  });

  it('accepts only supported account lanes', () => {
    expect(AccountLane.create('CLIENT').value).toBe('CLIENT');
    expect(() => AccountLane.create('ADMIN')).toThrow(InvalidAccountLaneError);
  });

  it('rejects inconsistent user lane, role, and staff-code combinations', () => {
    expect(() =>
      AuthUser.create({
        id: toAuthUserId('11111111-1111-4111-8111-111111111111'),
        lane: AccountLane.create('CLIENT'),
        roleCode: 'CLIENT',
        name: 'Member',
        email: EmailAddress.create('member@example.com'),
        emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
        googleId: null,
        staffCode: 'STF-INVALID',
      }),
    ).toThrow(AuthUserInvariantError);

    expect(() =>
      AuthUser.create({
        id: toAuthUserId('11111111-1111-4111-8111-111111111111'),
        lane: AccountLane.create('STAFF'),
        roleCode: 'STAFF_UNASSIGNED',
        name: 'Coach',
        email: EmailAddress.create('coach@example.com'),
        emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
        googleId: null,
        staffCode: null,
      }),
    ).toThrow(AuthUserInvariantError);
  });

  it('rejects a conflicting Google identity while permitting an idempotent relink', () => {
    const user = AuthUser.create({
      id: toAuthUserId('11111111-1111-4111-8111-111111111111'),
      lane: AccountLane.create('CLIENT'),
      roleCode: 'CLIENT',
      name: 'Member',
      email: EmailAddress.create('member@example.com'),
      emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
      googleId: 'google-subject',
      staffCode: null,
    });

    expect(user.withGoogleId('google-subject').googleId).toBe('google-subject');
    expect(() => user.withGoogleId('different-google-subject')).toThrow(AuthUserInvariantError);
  });
});
