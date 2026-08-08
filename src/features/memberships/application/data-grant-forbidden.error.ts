export class DataGrantForbiddenError extends Error {
  readonly code = 'DATA_GRANT_FORBIDDEN';

  constructor(message: string) {
    super(message);
    this.name = 'DataGrantForbiddenError';
  }
}
