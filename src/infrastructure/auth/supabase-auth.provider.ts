import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AuthProvider,
  AuthSession,
  AuthenticatedIdentity,
} from '../../features/auth/domain/auth-provider.port';
import { AuthenticationFailedError } from '../../features/auth/domain/authentication-failed.error';
import { EmailAddressInvalidError } from '../../features/auth/domain/email-address.error';
import { EmailAddress } from '../../features/auth/domain/email-address.value-object';
import { toAuthUserId } from '../../features/auth/domain/user.entity';
import type { Database } from '../supabase/database.types';
import { toIdentityFromAccessTokenClaims } from './access-token-claims.mapper';
import {
  mapSupabaseCredentialError,
  mapSupabaseOtpRequestError,
} from './supabase-auth-error.mapper';

export interface AccessTokenVerification {
  readonly jwtSecret: string | null;
  readonly issuer: string;
}

export interface SupabaseAuthProviderOptions extends AccessTokenVerification {
  /**
   * Temporary smoke backdoor: when set, this token skips the emailed OTP and
   * mints a real session via admin generateLink. Remove when no longer needed.
   */
  readonly masterEmailOtp?: string | null;
  /** Service-role client required when masterEmailOtp is set. */
  readonly adminClient?: SupabaseClient<Database> | null;
}

export class SupabaseAuthProvider implements AuthProvider {
  private readonly jwtSecret: Uint8Array | null;
  private readonly masterEmailOtp: string | null;
  private readonly adminClient: SupabaseClient<Database> | null;

  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly tokenVerification: SupabaseAuthProviderOptions,
  ) {
    this.jwtSecret =
      tokenVerification.jwtSecret === null
        ? null
        : new TextEncoder().encode(tokenVerification.jwtSecret);
    this.masterEmailOtp = tokenVerification.masterEmailOtp ?? null;
    this.adminClient = tokenVerification.adminClient ?? null;
  }

  async requestEmailOtp(email: EmailAddress): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({ email: email.value });
    if (error !== null) {
      throw mapSupabaseOtpRequestError(error);
    }
  }

  async verifyEmailOtp(email: EmailAddress, token: string): Promise<AuthSession> {
    if (this.masterEmailOtp !== null && token === this.masterEmailOtp) {
      return this.verifyWithMasterOtp(email);
    }
    return this.verifyProviderOtp(email, token, 'email');
  }

  private async verifyWithMasterOtp(email: EmailAddress): Promise<AuthSession> {
    if (this.adminClient === null) {
      throw new AuthenticationFailedError();
    }

    const { data, error } = await this.adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: email.value,
    });
    if (error !== null) {
      throw mapSupabaseCredentialError(error);
    }

    const minted = data.properties.email_otp;
    if (minted === undefined || minted.trim() === '') {
      throw new AuthenticationFailedError();
    }

    return this.verifyProviderOtp(email, minted, 'magiclink');
  }

  private async verifyProviderOtp(
    email: EmailAddress,
    token: string,
    type: 'email' | 'magiclink',
  ): Promise<AuthSession> {
    const { data, error } = await this.client.auth.verifyOtp({
      email: email.value,
      token,
      type,
    });
    if (error !== null) {
      throw mapSupabaseCredentialError(error);
    }
    if (data.session === null || data.user === null) {
      throw new AuthenticationFailedError();
    }

    return {
      ...toIdentity(data.user),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error !== null) {
      throw mapSupabaseCredentialError(error);
    }
    if (data.session === null || data.user === null) {
      throw new AuthenticationFailedError();
    }

    return {
      ...toIdentity(data.user),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  /**
   * Verifies access tokens without calling GoTrue `getUser` on every request.
   * Hosted projects sign with ES256 — `getClaims` checks JWKS locally (cached).
   * Local Docker still uses HS256; when `SUPABASE_JWT_SECRET` is set we verify
   * with jose (dynamic import — jose is ESM-only and this project emits CJS).
   */
  async getUserFromAccessToken(accessToken: string): Promise<AuthenticatedIdentity> {
    try {
      const alg = readJwtAlg(accessToken);
      if (alg === 'HS256' && this.jwtSecret !== null) {
        const { jwtVerify } = await import('jose');
        const { payload } = await jwtVerify(accessToken, this.jwtSecret, {
          issuer: this.tokenVerification.issuer,
          audience: 'authenticated',
          clockTolerance: 5,
        });
        return toIdentityFromAccessTokenClaims(payload);
      }

      const { data, error } = await this.client.auth.getClaims(accessToken);
      if (error !== null || data === null) {
        throw new AuthenticationFailedError();
      }
      return toIdentityFromAccessTokenClaims(data.claims);
    } catch (error) {
      if (error instanceof AuthenticationFailedError || error instanceof EmailAddressInvalidError) {
        throw error;
      }
      throw new AuthenticationFailedError();
    }
  }
}

function toIdentity(user: {
  readonly id: string;
  readonly email?: string;
  readonly email_confirmed_at?: string;
  readonly user_metadata?: { readonly full_name?: unknown; readonly name?: unknown };
  readonly identities?: ReadonlyArray<{
    readonly provider: string;
    readonly identity_data?: { readonly sub?: unknown };
  }>;
}): AuthenticatedIdentity {
  const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');
  const googleSubject = googleIdentity?.identity_data?.sub;
  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  let email: EmailAddress | null = null;

  if (user.email !== undefined) {
    try {
      email = EmailAddress.create(user.email);
    } catch (error) {
      throw new EmailAddressInvalidError({ cause: error });
    }
  }

  return {
    userId: toAuthUserId(user.id),
    email,
    emailVerifiedAt:
      user.email_confirmed_at === undefined ? null : new Date(user.email_confirmed_at),
    displayName: typeof displayName === 'string' && displayName.trim() !== '' ? displayName : null,
    googleId: typeof googleSubject === 'string' ? googleSubject : null,
  };
}

export function supabaseAuthIssuer(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
}

function readJwtAlg(accessToken: string): string | undefined {
  const headerPart = accessToken.split('.')[0];
  if (headerPart === undefined || headerPart.trim() === '') {
    throw new AuthenticationFailedError();
  }

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as {
      readonly alg?: unknown;
    };
    return typeof header.alg === 'string' ? header.alg : undefined;
  } catch {
    throw new AuthenticationFailedError();
  }
}
