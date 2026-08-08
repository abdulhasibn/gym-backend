export class ActiveMembershipConflictError extends Error {
  readonly code = 'ACTIVE_MEMBERSHIP_CONFLICT';

  constructor(message = 'Client already has an ACTIVE membership') {
    super(message);
    this.name = 'ActiveMembershipConflictError';
  }
}
