import { describe, expect, it } from 'vitest';

import { AuthenticationFailedError } from '../../domain/authentication-failed.error';
import { toIdentityFromAccessTokenClaims } from '../../../../infrastructure/auth/access-token-claims.mapper';

describe('toIdentityFromAccessTokenClaims', () => {
  it('maps a verified email user', () => {
    const identity = toIdentityFromAccessTokenClaims({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'member@example.com',
      email_verified: true,
      user_metadata: { full_name: 'Member' },
    });

    expect(identity).toMatchObject({
      userId: '11111111-1111-4111-8111-111111111111',
      displayName: 'Member',
      googleId: null,
    });
    expect(identity.email?.value).toBe('member@example.com');
    expect(identity.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('reads the Google subject from user metadata, not JWT sub', () => {
    const identity = toIdentityFromAccessTokenClaims({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'member@example.com',
      email_verified: true,
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { provider_id: 'google-subject', full_name: 'Member' },
    });

    expect(identity.googleId).toBe('google-subject');
  });

  it('rejects a payload without sub', () => {
    expect(() =>
      toIdentityFromAccessTokenClaims({
        email: 'member@example.com',
      }),
    ).toThrow(AuthenticationFailedError);
  });
});
