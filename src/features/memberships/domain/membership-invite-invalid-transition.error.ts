import type { MembershipInviteStatus } from './membership-invite-status';

export class MembershipInviteInvalidTransitionError extends Error {
  readonly code = 'MEMBERSHIP_INVITE_INVALID_TRANSITION';

  constructor(
    readonly from: MembershipInviteStatus,
    readonly to: MembershipInviteStatus,
  ) {
    super(`Membership invite cannot transition from ${from} to ${to}`);
    this.name = 'MembershipInviteInvalidTransitionError';
  }
}
