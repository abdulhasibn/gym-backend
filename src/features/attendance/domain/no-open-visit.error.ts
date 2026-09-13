export class NoOpenVisitError extends Error {
  readonly code = 'NO_OPEN_VISIT';

  constructor(message = 'No open visit to check out at this gym') {
    super(message);
    this.name = 'NoOpenVisitError';
  }
}
