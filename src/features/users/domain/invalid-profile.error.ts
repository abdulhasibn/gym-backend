export class InvalidProfileError extends Error {
  readonly code = 'INVALID_PROFILE';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidProfileError';
  }
}
