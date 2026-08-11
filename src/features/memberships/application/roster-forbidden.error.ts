export class RosterForbiddenError extends Error {
  readonly code = 'ROSTER_FORBIDDEN';

  constructor(message = 'Not allowed to access gym roster') {
    super(message);
    this.name = 'RosterForbiddenError';
  }
}
