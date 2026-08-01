/**
 * Generic infrastructure error — thrown when an operation conflicts with the
 * current state of a record (e.g. optimistic concurrency, invalid transition
 * detected at the persistence boundary). Mapped to HTTP 409.
 */
export class ConflictError extends Error {
  readonly code = 'CONFLICT';

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}
