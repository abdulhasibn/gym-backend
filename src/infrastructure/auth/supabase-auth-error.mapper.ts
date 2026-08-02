import {
  AuthRateLimitedError,
  OtpDeliveryFailedError,
  OtpExpiredError,
} from '../../features/auth/domain/auth-provider.error';
import { AuthenticationFailedError } from '../../features/auth/domain/authentication-failed.error';
import { EmailAddressInvalidError } from '../../features/auth/domain/email-address.error';

export interface SupabaseAuthErrorLike {
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
}

/**
 * Translates Supabase Auth / GoTrue failures into application errors.
 * Keeps provider SDK details inside infrastructure (architecture.mdc).
 */
export function mapSupabaseOtpRequestError(error: SupabaseAuthErrorLike): Error {
  if (isEmailAddressInvalid(error)) {
    return new EmailAddressInvalidError({ cause: error });
  }
  if (isAuthRateLimited(error)) {
    return new AuthRateLimitedError({ cause: error });
  }
  return new OtpDeliveryFailedError({ cause: error });
}

export function mapSupabaseCredentialError(error: SupabaseAuthErrorLike): Error {
  if (isAuthRateLimited(error)) {
    return new AuthRateLimitedError({ cause: error });
  }
  if (isOtpExpired(error)) {
    return new OtpExpiredError();
  }
  return new AuthenticationFailedError();
}

function isEmailAddressInvalid(error: SupabaseAuthErrorLike): boolean {
  return (
    error.code === 'email_address_invalid' || /email address .+ is invalid/i.test(error.message)
  );
}

function isAuthRateLimited(error: SupabaseAuthErrorLike): boolean {
  return (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    error.code === 'over_request_rate_limit'
  );
}

function isOtpExpired(error: SupabaseAuthErrorLike): boolean {
  return (
    error.code === 'otp_expired' ||
    (/^(?:the )?(?:otp|token|code) has expired\.?$/i.test(error.message) &&
      !/invalid/i.test(error.message))
  );
}
