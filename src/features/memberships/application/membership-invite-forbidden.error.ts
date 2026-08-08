export class MembershipInviteForbiddenError extends Error {
  readonly code = 'MEMBERSHIP_INVITE_FORBIDDEN';

  constructor(message: string) {
    super(message);
    this.name = 'MembershipInviteForbiddenError';
  }
}
