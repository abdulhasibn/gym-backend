export class LeadEmailRequiredError extends Error {
  readonly code = 'LEAD_EMAIL_REQUIRED';

  constructor(
    message = 'An email is required to convert a lead; set it on the lead or pass invitedEmail',
  ) {
    super(message);
    this.name = 'LeadEmailRequiredError';
  }
}
