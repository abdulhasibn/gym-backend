import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import {
  EmailNotVerifiedError,
  GoogleIdentityRequiredError,
  LaneMismatchError,
  LaneRequiredError,
  OAuthConfigurationError,
} from '../application/auth.errors';
import {
  AuthRateLimitedError,
  OtpDeliveryFailedError,
  OtpExpiredError,
} from '../domain/auth-provider.error';
import { AuthenticationFailedError } from '../domain/authentication-failed.error';
import { AuthUserInvariantError } from '../domain/auth-user-invariant.error';
import { EmailAddressInvalidError } from '../domain/email-address.error';
import { InvalidAccountLaneError } from '../domain/invalid-account-lane.error';

export const mapAuthError: ErrorMapper = (error) => {
  if (error instanceof AuthenticationFailedError) {
    return { status: 401, code: error.code, message: error.message };
  }
  if (error instanceof AuthRateLimitedError) {
    return { status: 429, code: error.code, message: error.message };
  }
  if (
    error instanceof EmailAddressInvalidError ||
    error instanceof EmailNotVerifiedError ||
    error instanceof GoogleIdentityRequiredError ||
    error instanceof InvalidAccountLaneError ||
    error instanceof LaneRequiredError ||
    error instanceof OtpExpiredError ||
    error instanceof AuthUserInvariantError
  ) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof OtpDeliveryFailedError) {
    return { status: 502, code: error.code, message: error.message };
  }
  if (error instanceof LaneMismatchError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof OAuthConfigurationError) {
    return { status: 503, code: error.code, message: error.message };
  }

  return null;
};
