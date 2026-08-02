export class AuthUserInvariantError extends Error {
  readonly code = 'AUTH_USER_INVARIANT';

  constructor(message: string) {
    super(message);
    this.name = 'AuthUserInvariantError';
  }
}
