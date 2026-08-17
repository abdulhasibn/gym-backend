export class CoachingForbiddenError extends Error {
  readonly code = 'COACHING_FORBIDDEN';

  constructor(message = 'Not allowed to perform this coaching action') {
    super(message);
    this.name = 'CoachingForbiddenError';
  }
}
