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
import {
  mapSupabaseCredentialError,
  mapSupabaseOtpRequestError,
} from './supabase-auth-error.mapper';

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async requestEmailOtp(email: EmailAddress): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({ email: email.value });
    if (error !== null) {
      throw mapSupabaseOtpRequestError(error);
    }
  }

  async verifyEmailOtp(email: EmailAddress, token: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.verifyOtp({
      email: email.value,
      token,
      type: 'email',
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

  async getUserFromAccessToken(accessToken: string): Promise<AuthenticatedIdentity> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error !== null) {
      throw mapSupabaseCredentialError(error);
    }
    if (data.user === null) {
      throw new AuthenticationFailedError();
    }

    return toIdentity(data.user);
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
