export class InvalidMembershipInviteeError extends Error {
  readonly code = 'INVALID_MEMBERSHIP_INVITEE';

  constructor(message = 'Invitee is not a valid client account for this invite') {
    super(message);
    this.name = 'InvalidMembershipInviteeError';
  }
}
