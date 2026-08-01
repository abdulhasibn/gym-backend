/**
 * Generic infrastructure error — thrown when a database operation fails in a
 * way that is expected to be retryable (timeouts, connection resets). Mapped
 * to HTTP 503.
 */
export class TransientDatabaseFailureError extends Error {
  readonly code = 'DB_TRANSIENT';

  constructor(message = 'Transient database failure', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TransientDatabaseFailureError';
  }
}
