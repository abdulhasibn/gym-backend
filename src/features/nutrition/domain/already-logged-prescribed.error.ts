export class AlreadyLoggedPrescribedError extends Error {
  readonly code = 'ALREADY_LOGGED_PRESCRIBED';

  constructor(message = 'This diet plan item is already logged for the day') {
    super(message);
    this.name = 'AlreadyLoggedPrescribedError';
  }
}
