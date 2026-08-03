export class AuthRateLimitedError extends Error {
  readonly code = 'AUTH_RATE_LIMITED';

  constructor(options?: { cause?: unknown }) {
    super('Too many authentication attempts. Try again later.', options);
    this.name = 'AuthRateLimitedError';
  }
}

export class OtpDeliveryFailedError extends Error {
  readonly code = 'OTP_DELIVERY_FAILED';

  constructor(options?: { cause?: unknown }) {
    super('Unable to send a one-time code right now', options);
    this.name = 'OtpDeliveryFailedError';
  }
}

export class OtpExpiredError extends Error {
  readonly code = 'OTP_EXPIRED';

  constructor() {
    // GoTrue returns otp_expired for both expired and wrong codes.
    super(
      'The one-time code is invalid or has expired. Request a new code and try again.',
    );
    this.name = 'OtpExpiredError';
  }
}
