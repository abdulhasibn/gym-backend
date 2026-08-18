import { AuthenticationFailedError } from '../../features/auth/domain/authentication-failed.error';
import type { AuthenticatedIdentity } from '../../features/auth/domain/auth-provider.port';
import { EmailAddress } from '../../features/auth/domain/email-address.value-object';
import { toAuthUserId } from '../../features/auth/domain/user.entity';

export interface AccessTokenClaims {
  readonly sub?: unknown;
  readonly email?: unknown;
  readonly email_verified?: unknown;
  readonly email_confirmed_at?: unknown;
  readonly user_metadata?: unknown;
  readonly app_metadata?: unknown;
}

interface AccessTokenUserMetadata {
  readonly full_name?: unknown;
  readonly name?: unknown;
  readonly email_verified?: unknown;
  readonly provider_id?: unknown;
  readonly sub?: unknown;
}

interface AccessTokenAppMetadata {
  readonly provider?: unknown;
  readonly providers?: unknown;
}

/**
 * Maps a verified Supabase access-token payload to the identity the auth
 * feature expects. Google subject comes from app/user metadata, never from
 * the JWT `sub` (that is the Auth user id).
 */
export function toIdentityFromAccessTokenClaims(payload: AccessTokenClaims): AuthenticatedIdentity {
  if (typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new AuthenticationFailedError();
  }

  const userMetadata = isRecord(payload.user_metadata)
    ? (payload.user_metadata as AccessTokenUserMetadata)
    : undefined;
  const appMetadata = isRecord(payload.app_metadata)
    ? (payload.app_metadata as AccessTokenAppMetadata)
    : undefined;
  const displayName = userMetadata?.full_name ?? userMetadata?.name;

  return {
    userId: toAuthUserId(payload.sub),
    email: parseEmail(payload.email),
    emailVerifiedAt: emailVerifiedAt(payload, userMetadata),
    displayName: typeof displayName === 'string' && displayName.trim() !== '' ? displayName : null,
    googleId: googleIdFromClaims(appMetadata, userMetadata),
  };
}

function parseEmail(value: unknown): EmailAddress | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return EmailAddress.create(value);
}

function emailVerifiedAt(
  payload: AccessTokenClaims,
  userMetadata: AccessTokenUserMetadata | undefined,
): Date | null {
  if (typeof payload.email_confirmed_at === 'string') {
    const parsed = new Date(payload.email_confirmed_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (payload.email_verified === true || userMetadata?.email_verified === true) {
    return new Date();
  }
  return null;
}

function googleIdFromClaims(
  appMetadata: AccessTokenAppMetadata | undefined,
  userMetadata: AccessTokenUserMetadata | undefined,
): string | null {
  if (!isGoogleProvider(appMetadata)) {
    return null;
  }
  const providerId = userMetadata?.provider_id;
  if (typeof providerId === 'string' && providerId.trim() !== '') {
    return providerId;
  }
  const googleSubject = userMetadata?.sub;
  if (typeof googleSubject === 'string' && googleSubject.trim() !== '') {
    return googleSubject;
  }
  return null;
}

function isGoogleProvider(appMetadata: AccessTokenAppMetadata | undefined): boolean {
  if (appMetadata?.provider === 'google') {
    return true;
  }
  return Array.isArray(appMetadata?.providers) && appMetadata.providers.includes('google');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
