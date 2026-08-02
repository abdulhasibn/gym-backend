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
    super('The one-time code has expired. Request a new code and try again.');
    this.name = 'OtpExpiredError';
  }
}
