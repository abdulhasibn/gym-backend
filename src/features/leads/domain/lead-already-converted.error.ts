export class LeadAlreadyConvertedError extends Error {
  readonly code = 'LEAD_ALREADY_CONVERTED';

  constructor(message = 'Lead has already been converted to a membership invite') {
    super(message);
    this.name = 'LeadAlreadyConvertedError';
  }
}
