import { describe, expect, it } from 'vitest';

import { RefreshSessionUseCase } from '../../application/refresh-session.use-case';
import type {
  AuthProvider,
  AuthSession,
  AuthenticatedIdentity,
} from '../../domain/auth-provider.port';
import { AuthenticationFailedError } from '../../domain/authentication-failed.error';
import { EmailAddress } from '../../domain/email-address.value-object';
import { toAuthUserId } from '../../domain/user.entity';

class FakeAuthProvider implements AuthProvider {
  refreshError: Error | null = null;
  lastRefreshToken: string | null = null;

  async requestEmailOtp(): Promise<void> {
    throw new Error('Not used by RefreshSessionUseCase');
  }

  async verifyEmailOtp(): Promise<AuthSession> {
    throw new Error('Not used by RefreshSessionUseCase');
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    this.lastRefreshToken = refreshToken;
    if (this.refreshError !== null) {
      throw this.refreshError;
    }

    return {
      userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
      email: EmailAddress.create('member@example.com'),
      emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
      displayName: 'Member',
      googleId: null,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    };
  }

  async getUserFromAccessToken(): Promise<AuthenticatedIdentity> {
    throw new Error('Not used by RefreshSessionUseCase');
  }
}

describe('RefreshSessionUseCase', () => {
  it('returns a rotated session from the auth provider', async () => {
    const authProvider = new FakeAuthProvider();
    const result = await new RefreshSessionUseCase(authProvider).execute('old-refresh-token');

    expect(authProvider.lastRefreshToken).toBe('old-refresh-token');
    expect(result).toEqual({
      session: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      },
    });
  });

  it('propagates authentication failures from the provider', async () => {
    const authProvider = new FakeAuthProvider();
    authProvider.refreshError = new AuthenticationFailedError();

    await expect(
      new RefreshSessionUseCase(authProvider).execute('bad-refresh-token'),
    ).rejects.toBeInstanceOf(AuthenticationFailedError);
  });
});
