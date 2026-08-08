export class MembershipInviteExpiredError extends Error {
  readonly code = 'MEMBERSHIP_INVITE_EXPIRED';

  constructor(message = 'Membership invite has expired') {
    super(message);
    this.name = 'MembershipInviteExpiredError';
  }
}
