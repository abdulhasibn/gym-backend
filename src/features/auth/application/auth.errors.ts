export class EmailNotVerifiedError extends Error {
  readonly code = 'EMAIL_NOT_VERIFIED';

  constructor() {
    super('A verified email address is required');
    this.name = 'EmailNotVerifiedError';
  }
}

export class GoogleIdentityRequiredError extends Error {
  readonly code = 'GOOGLE_IDENTITY_REQUIRED';

  constructor() {
    super('A Google identity is required to complete Google sign-in');
    this.name = 'GoogleIdentityRequiredError';
  }
}

export class LaneMismatchError extends Error {
  readonly code = 'LANE_MISMATCH';

  constructor() {
    super('This account was created for a different account lane');
    this.name = 'LaneMismatchError';
  }
}

export class OAuthConfigurationError extends Error {
  readonly code = 'OAUTH_CONFIGURATION';

  constructor() {
    super('Google OAuth callback configuration is unavailable');
    this.name = 'OAuthConfigurationError';
  }
}
