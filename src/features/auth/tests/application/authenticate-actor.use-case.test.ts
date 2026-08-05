import { describe, expect, it } from 'vitest';

import { AuthenticateActorUseCase } from '../../application/authenticate-actor.use-case';
import type {
  AuthenticatedIdentity,
  AuthProvider,
  AuthSession,
} from '../../domain/auth-provider.port';
import { AccountLane } from '../../domain/account-lane.value-object';
import { EmailAddress } from '../../domain/email-address.value-object';
import { toAuthUserId } from '../../domain/user.entity';
import { InMemoryAuthUserRepository } from '../fakes/in-memory-auth-user.repository';
import { AuthenticationFailedError } from '../../domain/authentication-failed.error';

class FakeAuthProvider implements AuthProvider {
  constructor(readonly identity: AuthenticatedIdentity) {}

  async requestEmailOtp(): Promise<void> {}

  async verifyEmailOtp(): Promise<never> {
    throw new Error('Not used by AuthenticateActorUseCase');
  }

  async refreshSession(): Promise<AuthSession> {
    throw new Error('Not used by AuthenticateActorUseCase');
  }

  async getUserFromAccessToken(): Promise<AuthenticatedIdentity> {
    return this.identity;
  }
}

const identity: AuthenticatedIdentity = {
  userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
  email: EmailAddress.create('member@example.com'),
  emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
  displayName: 'Member',
  googleId: null,
};

describe('AuthenticateActorUseCase', () => {
  it('rejects an identity without a provisioned application user', async () => {
    const users = new InMemoryAuthUserRepository();

    await expect(
      new AuthenticateActorUseCase(new FakeAuthProvider(identity), users).execute('access-token'),
    ).rejects.toBeInstanceOf(AuthenticationFailedError);
  });

  it('returns the actor from the provisioned user view', async () => {
    const users = new InMemoryAuthUserRepository();
    await users.create({
      id: identity.userId,
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
      email: EmailAddress.create('member@example.com'),
      emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
      googleId: null,
      staffCode: null,
    });

    await expect(
      new AuthenticateActorUseCase(new FakeAuthProvider(identity), users).execute('access-token'),
    ).resolves.toMatchObject({
      userId: identity.userId,
      roleCode: 'CLIENT',
      lane: 'CLIENT',
      email: 'member@example.com',
    });
  });
});
