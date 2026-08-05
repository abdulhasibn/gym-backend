import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { AuthRateLimitedError, OtpExpiredError } from '../../domain/auth-provider.error';
import { EmailAddressInvalidError } from '../../domain/email-address.error';
import { EmailAddress } from '../../domain/email-address.value-object';
import { CompleteGoogleAuthUseCase } from '../../application/complete-google-auth.use-case';
import { GetCurrentUserUseCase } from '../../application/get-current-user.use-case';
import { ProvisionAuthUserUseCase } from '../../application/provision-auth-user.use-case';
import { RefreshSessionUseCase } from '../../application/refresh-session.use-case';
import { RequestEmailOtpUseCase } from '../../application/request-email-otp.use-case';
import { VerifyEmailOtpUseCase } from '../../application/verify-email-otp.use-case';
import type {
  AuthProvider,
  AuthSession,
  AuthenticatedIdentity,
} from '../../domain/auth-provider.port';
import { AuthenticationFailedError } from '../../domain/authentication-failed.error';
import { toAuthUserId } from '../../domain/user.entity';
import {
  createAuthenticateIdentityMiddleware,
  createAuthenticateMiddleware,
} from '../../presentation/authenticate.middleware';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { AuthController } from '../../presentation/auth.controller';
import { createAuthRouter } from '../../presentation/auth.routes';
import { mapAuthError } from '../../presentation/auth.error-mapper';
import { AuthenticateActorUseCase } from '../../application/authenticate-actor.use-case';
import { AccountLane } from '../../domain/account-lane.value-object';
import { InMemoryAuthUserRepository } from '../fakes/in-memory-auth-user.repository';

class FakeAuthProvider implements AuthProvider {
  requestOtpError: Error | null = null;
  verifyOtpError: Error | null = null;
  refreshError: Error | null = null;

  readonly identity: AuthenticatedIdentity = {
    userId: toAuthUserId('11111111-1111-4111-8111-111111111111'),
    email: EmailAddress.create('member@example.com'),
    emailVerifiedAt: new Date('2026-08-02T00:00:00.000Z'),
    displayName: 'Member',
    googleId: null,
  };

  async requestEmailOtp(): Promise<void> {
    if (this.requestOtpError !== null) {
      throw this.requestOtpError;
    }
  }

  async verifyEmailOtp(): Promise<AuthSession> {
    if (this.verifyOtpError !== null) {
      throw this.verifyOtpError;
    }

    return {
      ...this.identity,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    };
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    if (this.refreshError !== null) {
      throw this.refreshError;
    }
    if (refreshToken !== 'refresh-token') {
      throw new AuthenticationFailedError();
    }

    return {
      ...this.identity,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    };
  }

  async getUserFromAccessToken(accessToken: string): Promise<AuthenticatedIdentity> {
    if (accessToken !== 'access-token' && accessToken !== 'new-access-token') {
      throw new Error('invalid token');
    }
    return this.identity;
  }
}

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

function createTestApp(
  authProvider: FakeAuthProvider = new FakeAuthProvider(),
  enableGoogleCallbackHelper = true,
) {
  const users = new InMemoryAuthUserRepository();
  const provision = new ProvisionAuthUserUseCase(users, { generate: () => 'STF-TESTCODE01' });
  const controller = new AuthController(
    new RequestEmailOtpUseCase(authProvider, users),
    new VerifyEmailOtpUseCase(authProvider, provision),
    new RefreshSessionUseCase(authProvider),
    new CompleteGoogleAuthUseCase(provision),
    new GetCurrentUserUseCase(users),
  );
  const app = express();
  app.use(express.json());
  app.use(
    '/auth',
    createAuthRouter(
      controller,
      createAuthenticateIdentityMiddleware(authProvider),
      createAuthenticateMiddleware(new AuthenticateActorUseCase(authProvider, users)),
      {
        supabaseUrl: 'https://example.supabase.co',
        enableCallbackHelper: enableGoogleCallbackHelper,
      },
    ),
  );
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapAuthError]));
  return { app, users };
}

describe('auth routes', () => {
  it('rejects malformed OTP requests', async () => {
    const response = await supertest(createTestApp().app)
      .post('/auth/otp/request')
      .send({ email: 'bad' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns 422 when the auth provider rejects the email address', async () => {
    const authProvider = new FakeAuthProvider();
    authProvider.requestOtpError = new EmailAddressInvalidError();

    const response = await supertest(createTestApp(authProvider).app)
      .post('/auth/otp/request')
      .send({ email: 'you@example.com' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      error: {
        code: 'EMAIL_ADDRESS_INVALID',
        message: 'The email address is not accepted',
      },
    });
  });

  it('returns 429 when the auth provider rate-limits OTP sends', async () => {
    const authProvider = new FakeAuthProvider();
    authProvider.requestOtpError = new AuthRateLimitedError();

    const response = await supertest(createTestApp(authProvider).app)
      .post('/auth/otp/request')
      .send({ email: 'member@example.com' });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      error: {
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many authentication attempts. Try again later.',
      },
    });
  });

  it('returns isNewUser true on first OTP request for an unknown email', async () => {
    const response = await supertest(createTestApp().app)
      .post('/auth/otp/request')
      .send({ email: 'member@example.com' });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: 'OTP_SENT', isNewUser: true });
  });

  it('returns isNewUser false when the email already has an app account', async () => {
    const { app, users } = createTestApp();
    await new ProvisionAuthUserUseCase(users, { generate: () => 'STF-TESTCODE01' }).execute({
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

    const response = await supertest(app)
      .post('/auth/otp/request')
      .send({ email: 'member@example.com' });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: 'OTP_SENT', isNewUser: false });
  });

  it('returns 422 when an OTP has expired', async () => {
    const authProvider = new FakeAuthProvider();
    authProvider.verifyOtpError = new OtpExpiredError();

    const response = await supertest(createTestApp(authProvider).app)
      .post('/auth/otp/verify')
      .send({
        email: 'member@example.com',
        token: '123456',
        lane: 'CLIENT',
      });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { code: 'OTP_EXPIRED' } });
  });

  it('returns 401 from /auth/me without a Bearer token', async () => {
    const response = await supertest(createTestApp().app).get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'AUTHENTICATION_FAILED' } });
  });

  it('refreshes a session with a valid refresh token', async () => {
    const response = await supertest(createTestApp().app).post('/auth/refresh').send({
      refreshToken: 'refresh-token',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      session: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      },
    });
  });

  it('rejects an empty refresh body', async () => {
    const response = await supertest(createTestApp().app).post('/auth/refresh').send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns 401 for an invalid refresh token', async () => {
    const response = await supertest(createTestApp().app).post('/auth/refresh').send({
      refreshToken: 'bad-refresh-token',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'AUTHENTICATION_FAILED' } });
  });

  it('verifies OTP then returns the provisioned user', async () => {
    const { app } = createTestApp();
    const verify = await supertest(app).post('/auth/otp/verify').send({
      email: 'member@example.com',
      token: '123456',
      lane: 'CLIENT',
      name: 'Member',
    });
    const me = await supertest(app).get('/auth/me').set('Authorization', 'Bearer access-token');

    expect(verify.status).toBe(200);
    expect(verify.body).toMatchObject({ user: { lane: 'CLIENT', roleCode: 'CLIENT' } });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ user: { email: 'member@example.com' } });
  });

  it('does not render OAuth tokens in the callback page', async () => {
    const response = await supertest(createTestApp().app).get('/auth/google/callback');

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('id="accessToken"');
    expect(response.text).not.toContain('<pre');
  });

  it('does not expose the local OAuth callback helper when disabled', async () => {
    const { app } = createTestApp(new FakeAuthProvider(), false);

    const callback = await supertest(app).get('/auth/google/callback');
    const start = await supertest(app).get('/auth/google/start');

    expect(callback.status).toBe(404);
    expect(start.status).toBe(503);
    expect(start.body).toMatchObject({ error: { code: 'OAUTH_CONFIGURATION' } });
  });

  it('delegates an OAuth start configuration failure to the global error handler', async () => {
    const response = await supertest(createTestApp().app).get('/auth/google/start').set('Host', '');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: { code: 'OAUTH_CONFIGURATION' } });
  });
});
