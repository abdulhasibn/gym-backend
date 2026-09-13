export class AlreadyCheckedInError extends Error {
  readonly code = 'ALREADY_CHECKED_IN';

  constructor(message = 'Client already has an open visit at this gym') {
    super(message);
    this.name = 'AlreadyCheckedInError';
  }
}
