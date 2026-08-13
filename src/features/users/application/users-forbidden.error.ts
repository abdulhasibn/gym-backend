export class UsersForbiddenError extends Error {
  readonly code = 'USERS_FORBIDDEN';

  constructor(message = 'Not allowed to access this user data') {
    super(message);
    this.name = 'UsersForbiddenError';
  }
}
