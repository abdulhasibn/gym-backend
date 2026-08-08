export class InvalidInvitePlanError extends Error {
  readonly code = 'INVALID_INVITE_PLAN';

  constructor(message = 'Plan is not valid for this membership invite') {
    super(message);
    this.name = 'InvalidInvitePlanError';
  }
}
