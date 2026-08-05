import { beforeEach, describe, expect, it } from 'vitest';

import { RequestEmailOtpUseCase } from '../../application/request-email-otp.use-case';
import { VerifyEmailOtpUseCase } from '../../application/verify-email-otp.use-case';
import { ProvisionAuthUserUseCase } from '../../application/provision-auth-user.use-case';
import type {
  AuthProvider,
  AuthSession,
  AuthenticatedIdentity,
} from '../../domain/auth-provider.port';
import { AccountLane } from '../../domain/account-lane.value-object';
import { AuthRateLimitedError, OtpExpiredError } from '../../domain/auth-provider.error';
import { EmailAddress } from '../../domain/email-address.value-object';
import { toAuthUserId } from '../../domain/user.entity';
import { InMemoryAuthUserRepository } from '../fakes/in-memory-auth-user.repository';

class FakeAuthProvider implements AuthProvider {
  requestError: Error | null = null;
  verifyError: Error | null = null;
  requestEmail: EmailAddress | null = null;

  async requestEmailOtp(email: EmailAddress): Promise<void> {
    this.requestEmail = email;
    if (this.requestError !== null) {
      throw this.requestError;
    }
  }

  async verifyEmailOtp(): Promise<AuthSession> {
    if (this.verifyError !== null) {
      throw this.verifyError;
    }

    return {
      userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
      email: EmailAddress.create('member@example.com'),
      emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
      displayName: 'Member',
      googleId: null,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    };
  }

  async refreshSession(): Promise<AuthSession> {
    throw new Error('Not used by email OTP use cases');
  }

  async getUserFromAccessToken(): Promise<AuthenticatedIdentity> {
    throw new Error('Not used by email OTP use cases');
  }
}

describe('email OTP use cases', () => {
  let authProvider: FakeAuthProvider;
  let users: InMemoryAuthUserRepository;

  beforeEach(() => {
    authProvider = new FakeAuthProvider();
    users = new InMemoryAuthUserRepository();
  });

  it('requests an OTP and reports a new user when no account exists', async () => {
    const result = await new RequestEmailOtpUseCase(authProvider, users).execute(
      EmailAddress.create('member@example.com'),
    );

    expect(authProvider.requestEmail?.value).toBe('member@example.com');
    expect(result).toEqual({ status: 'OTP_SENT', isNewUser: true });
  });

  it('reports a returning user when an account already exists for the email', async () => {
    const provisionUser = new ProvisionAuthUserUseCase(users, {
      generate: () => 'STF-TESTCODE01',
    });
    await provisionUser.execute({
      identity: {
        userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
        email: EmailAddress.create('member@example.com'),
        emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
        displayName: 'Member',
        googleId: null,
      },
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    const result = await new RequestEmailOtpUseCase(authProvider, users).execute(
      EmailAddress.create('member@example.com'),
    );

    expect(result).toEqual({ status: 'OTP_SENT', isNewUser: false });
  });

  it('propagates request rate limits', async () => {
    authProvider.requestError = new AuthRateLimitedError();

    await expect(
      new RequestEmailOtpUseCase(authProvider, users).execute(
        EmailAddress.create('member@example.com'),
      ),
    ).rejects.toBeInstanceOf(AuthRateLimitedError);
  });

  it('provisions the selected lane after verifying an OTP', async () => {
    const provisionUser = new ProvisionAuthUserUseCase(users, {
      generate: () => 'STF-TESTCODE01',
    });
    const useCase = new VerifyEmailOtpUseCase(authProvider, provisionUser);

    const result = await useCase.execute({
      email: EmailAddress.create('member@example.com'),
      token: '123456',
      lane: AccountLane.create('CLIENT'),
      name: 'Member',
    });

    expect(result).toMatchObject({ user: { lane: 'CLIENT', roleCode: 'CLIENT' } });
  });

  it('uses the provider display name when first-time verification omits a name', async () => {
    const provisionUser = new ProvisionAuthUserUseCase(users, {
      generate: () => 'STF-TESTCODE01',
    });

    const result = await new VerifyEmailOtpUseCase(authProvider, provisionUser).execute({
      email: EmailAddress.create('member@example.com'),
      token: '123456',
      lane: AccountLane.create('CLIENT'),
    });

    expect(result.user.name).toBe('Member');
  });

  it('allows a returning user to verify without a name', async () => {
    const provisionUser = new ProvisionAuthUserUseCase(users, {
      generate: () => 'STF-TESTCODE01',
    });
    const useCase = new VerifyEmailOtpUseCase(authProvider, provisionUser);

    await useCase.execute({
      email: EmailAddress.create('member@example.com'),
      token: '123456',
      lane: AccountLane.create('CLIENT'),
      name: 'Original member',
    });
    const result = await useCase.execute({
      email: EmailAddress.create('member@example.com'),
      token: '123456',
      lane: AccountLane.create('CLIENT'),
    });

    expect(result.user.name).toBe('Original member');
  });

  it('allows a returning user to verify without a lane', async () => {
    const provisionUser = new ProvisionAuthUserUseCase(users, {
      generate: () => 'STF-TESTCODE01',
    });
    const useCase = new VerifyEmailOtpUseCase(authProvider, provisionUser);

    await useCase.execute({
      email: EmailAddress.create('member@example.com'),
      token: '123456',
      lane: AccountLane.create('CLIENT'),
      name: 'Original member',
    });
    const result = await useCase.execute({
      email: EmailAddress.create('member@example.com'),
      token: '123456',
    });

    expect(result.user).toMatchObject({ lane: 'CLIENT', name: 'Original member' });
  });

  it('propagates expired OTP errors', async () => {
    authProvider.verifyError = new OtpExpiredError();
    const provisionUser = new ProvisionAuthUserUseCase(users, {
      generate: () => 'STF-TESTCODE01',
    });

    await expect(
      new VerifyEmailOtpUseCase(authProvider, provisionUser).execute({
        email: EmailAddress.create('member@example.com'),
        token: '123456',
        lane: AccountLane.create('CLIENT'),
        name: 'Member',
      }),
    ).rejects.toBeInstanceOf(OtpExpiredError);
  });
});
