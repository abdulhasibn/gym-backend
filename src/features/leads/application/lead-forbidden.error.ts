export class LeadForbiddenError extends Error {
  readonly code = 'LEAD_FORBIDDEN';

  constructor(message = 'Not allowed to access leads for this gym organization') {
    super(message);
    this.name = 'LeadForbiddenError';
  }
}
