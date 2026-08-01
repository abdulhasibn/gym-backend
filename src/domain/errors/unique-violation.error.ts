/**
 * Generic infrastructure error — thrown by repository implementations when a
 * unique/partial-unique constraint is violated at the database. Mapped to
 * HTTP 409.
 */
export class UniqueViolationError extends Error {
  readonly code = 'UNIQUE_VIOLATION';

  constructor(message = 'Unique constraint violated') {
    super(message);
    this.name = 'UniqueViolationError';
  }
}
