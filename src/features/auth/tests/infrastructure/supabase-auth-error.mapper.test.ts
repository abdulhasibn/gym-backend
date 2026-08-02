import { describe, expect, it } from 'vitest';

import {
  AuthRateLimitedError,
  OtpDeliveryFailedError,
  OtpExpiredError,
} from '../../domain/auth-provider.error';
import { AuthenticationFailedError } from '../../domain/authentication-failed.error';
import { EmailAddressInvalidError } from '../../domain/email-address.error';
import {
  mapSupabaseCredentialError,
  mapSupabaseOtpRequestError,
} from '../../../../infrastructure/auth/supabase-auth-error.mapper';

describe('mapSupabaseOtpRequestError', () => {
  it('maps email_address_invalid to EmailAddressInvalidError', () => {
    const error = mapSupabaseOtpRequestError({
      message: 'Email address "you@example.com" is invalid',
      status: 400,
      code: 'email_address_invalid',
    });

    expect(error).toBeInstanceOf(EmailAddressInvalidError);
    expect(error).toMatchObject({ code: 'EMAIL_ADDRESS_INVALID' });
  });

  it('maps over_email_send_rate_limit to AuthRateLimitedError', () => {
    const error = mapSupabaseOtpRequestError({
      message: 'email rate limit exceeded',
      status: 429,
      code: 'over_email_send_rate_limit',
    });

    expect(error).toBeInstanceOf(AuthRateLimitedError);
    expect(error).toMatchObject({ code: 'AUTH_RATE_LIMITED' });
  });

  it('maps unknown provider failures to OtpDeliveryFailedError', () => {
    const error = mapSupabaseOtpRequestError({
      message: 'smtp unavailable',
      status: 500,
      code: 'unexpected_failure',
    });

    expect(error).toBeInstanceOf(OtpDeliveryFailedError);
    expect(error).toMatchObject({ code: 'OTP_DELIVERY_FAILED' });
  });
});

describe('mapSupabaseCredentialError', () => {
  it('maps rate limits during verify/getUser', () => {
    const error = mapSupabaseCredentialError({
      message: 'request rate limit exceeded',
      status: 429,
      code: 'over_request_rate_limit',
    });

    expect(error).toBeInstanceOf(AuthRateLimitedError);
  });

  it('maps other credential failures to AuthenticationFailedError', () => {
    const error = mapSupabaseCredentialError({
      message: 'Token has expired or is invalid',
      status: 401,
      code: 'bad_jwt',
    });

    expect(error).toBeInstanceOf(AuthenticationFailedError);
  });

  it('maps otp_expired to OtpExpiredError', () => {
    const error = mapSupabaseCredentialError({
      message: 'The OTP has expired',
      status: 400,
      code: 'otp_expired',
    });

    expect(error).toBeInstanceOf(OtpExpiredError);
    expect(error).toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('maps GoTrue expired-or-invalid OTP responses by their otp_expired code', () => {
    const error = mapSupabaseCredentialError({
      message: 'Token has expired or is invalid',
      status: 403,
      code: 'otp_expired',
    });

    expect(error).toBeInstanceOf(OtpExpiredError);
    expect(error).toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('does not classify ambiguous expired-or-invalid messages as expired', () => {
    const error = mapSupabaseCredentialError({
      message: 'Token has expired or is invalid',
      status: 401,
      code: 'bad_jwt',
    });

    expect(error).toBeInstanceOf(AuthenticationFailedError);
  });
});
