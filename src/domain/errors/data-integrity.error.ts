/**
 * Raised when persisted data contradicts a required domain invariant.
 * This indicates data corruption or an incompatible schema/seed, not a
 * request a caller can correct.
 */
export class DataIntegrityError extends Error {
  readonly code = 'DATA_INTEGRITY';

  constructor(message = 'Persisted data is inconsistent', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DataIntegrityError';
  }
}
