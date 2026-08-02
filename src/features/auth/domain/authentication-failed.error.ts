export class AuthenticationFailedError extends Error {
  readonly code = 'AUTHENTICATION_FAILED';

  constructor() {
    super('The authentication credentials are invalid or expired');
    this.name = 'AuthenticationFailedError';
  }
}
