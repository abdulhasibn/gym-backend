export class LeadDeletedError extends Error {
  readonly code = 'LEAD_DELETED';

  constructor(message = 'Lead has been deleted') {
    super(message);
    this.name = 'LeadDeletedError';
  }
}
