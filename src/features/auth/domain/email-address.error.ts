export class EmailAddressInvalidError extends Error {
  readonly code = 'EMAIL_ADDRESS_INVALID';

  constructor(options?: { cause?: unknown }) {
    super('The email address is not accepted', options);
    this.name = 'EmailAddressInvalidError';
  }
}
