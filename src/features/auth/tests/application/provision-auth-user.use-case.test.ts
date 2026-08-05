import { beforeEach, describe, expect, it } from 'vitest';

import { EmailNotVerifiedError, LaneMismatchError, LaneRequiredError } from '../../application/auth.errors';
import { ProvisionAuthUserUseCase } from '../../application/provision-auth-user.use-case';
import type { AuthenticatedIdentity } from '../../domain/auth-provider.port';
import { AccountLane } from '../../domain/account-lane.value-object';
import { EmailAddress } from '../../domain/email-address.value-object';
import { toAuthUserId } from '../../domain/user.entity';
import { InMemoryAuthUserRepository } from '../fakes/in-memory-auth-user.repository';

function identity(overrides: Partial<AuthenticatedIdentity> = {}): AuthenticatedIdentity {
  return {
    userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
    email: EmailAddress.create('member@example.com'),
    emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
    displayName: 'Member',
    googleId: null,
    ...overrides,
  };
}

describe('ProvisionAuthUserUseCase', () => {
  let users: InMemoryAuthUserRepository;
  let useCase: ProvisionAuthUserUseCase;

  beforeEach(() => {
    users = new InMemoryAuthUserRepository();
    useCase = new ProvisionAuthUserUseCase(users, { generate: () => 'STF-TESTCODE01' });
  });

  it('assigns the CLIENT role without a staff code', async () => {
    const user = await useCase.execute({
      identity: identity(),
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    expect(user.roleCode).toBe('CLIENT');
    expect(user.staffCode).toBeNull();
  });

  it('assigns the unassigned staff role and staff code', async () => {
    const user = await useCase.execute({
      identity: identity(),
      lane: AccountLane.create('STAFF'),
      name: 'Coach',
    });

    expect(user.roleCode).toBe('STAFF_UNASSIGNED');
    expect(user.staffCode).toBe('STF-TESTCODE01');
  });

  it('rejects a lane change for an existing account', async () => {
    await useCase.execute({
      identity: identity(),
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    await expect(
      useCase.execute({ identity: identity(), lane: AccountLane.create('STAFF'), name: 'Member' }),
    ).rejects.toBeInstanceOf(LaneMismatchError);
  });

  it('allows a returning sign-in without a lane', async () => {
    await useCase.execute({
      identity: identity(),
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    const user = await useCase.execute({
      identity: identity(),
      name: 'Member',
    });

    expect(user.lane.value).toBe('CLIENT');
  });

  it('requires a lane when creating a new account', async () => {
    await expect(
      useCase.execute({
        identity: identity(),
        name: 'Member',
      }),
    ).rejects.toBeInstanceOf(LaneRequiredError);
  });

  it('requires a verified email address', async () => {
    await expect(
      useCase.execute({
        identity: identity({ emailVerifiedAt: null }),
        lane: AccountLane.create('CLIENT'),
        name: 'Member',
      }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
  });

  it('links a Google identity for an existing account', async () => {
    await useCase.execute({
      identity: identity(),
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    await useCase.execute({
      identity: identity({ googleId: 'google-subject' }),
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    expect((await users.findById(identity().userId))?.googleId).toBe('google-subject');
  });

  it('permits relinking the same Google identity', async () => {
    const googleIdentity = identity({ googleId: 'google-subject' });
    await useCase.execute({
      identity: googleIdentity,
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    await expect(
      useCase.execute({
        identity: googleIdentity,
        lane: AccountLane.create('CLIENT'),
        name: 'Member',
      }),
    ).resolves.toMatchObject({ id: googleIdentity.userId });
  });
});
