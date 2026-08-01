/**
 * Generic infrastructure error — thrown by repository implementations when a
 * required record does not exist. Consumed by every feature's application
 * layer and mapped to HTTP 404 by the presentation error handler.
 */
export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
