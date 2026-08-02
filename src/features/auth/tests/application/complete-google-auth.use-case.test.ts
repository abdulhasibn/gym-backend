import { describe, expect, it } from 'vitest';

import { CompleteGoogleAuthUseCase } from '../../application/complete-google-auth.use-case';
import { GoogleIdentityRequiredError } from '../../application/auth.errors';
import { ProvisionAuthUserUseCase } from '../../application/provision-auth-user.use-case';
import type { AuthenticatedIdentity } from '../../domain/auth-provider.port';
import { AccountLane } from '../../domain/account-lane.value-object';
import { EmailAddress } from '../../domain/email-address.value-object';
import { toAuthUserId } from '../../domain/user.entity';
import { InMemoryAuthUserRepository } from '../fakes/in-memory-auth-user.repository';

function googleIdentity(overrides: Partial<AuthenticatedIdentity> = {}): AuthenticatedIdentity {
  return {
    userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
    email: EmailAddress.create('member@example.com'),
    emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
    displayName: 'Google Member',
    googleId: 'google-subject',
    ...overrides,
  };
}

describe('CompleteGoogleAuthUseCase', () => {
  it('rejects a non-Google session', async () => {
    const users = new InMemoryAuthUserRepository();
    const useCase = new CompleteGoogleAuthUseCase(
      new ProvisionAuthUserUseCase(users, { generate: () => 'STF-TESTCODE01' }),
    );

    await expect(
      useCase.execute({
        identity: googleIdentity({ googleId: null }),
        lane: AccountLane.create('CLIENT'),
        name: null,
      }),
    ).rejects.toBeInstanceOf(GoogleIdentityRequiredError);
  });

  it('is idempotent for a completed Google account', async () => {
    const users = new InMemoryAuthUserRepository();
    const useCase = new CompleteGoogleAuthUseCase(
      new ProvisionAuthUserUseCase(users, { generate: () => 'STF-TESTCODE01' }),
    );
    const command = { identity: googleIdentity(), lane: AccountLane.create('CLIENT'), name: null };

    const first = await useCase.execute(command);
    const second = await useCase.execute(command);

    expect(second).toEqual(first);
  });
});
