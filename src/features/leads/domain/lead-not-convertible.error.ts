export class LeadNotConvertibleError extends Error {
  readonly code = 'LEAD_NOT_CONVERTIBLE';

  constructor(message = 'Lost leads cannot be converted; create a new lead for a re-inquiry') {
    super(message);
    this.name = 'LeadNotConvertibleError';
  }
}
