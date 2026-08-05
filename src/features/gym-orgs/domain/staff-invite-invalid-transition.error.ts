import type { StaffInviteStatus } from './staff-invite-status';

export class StaffInviteInvalidTransitionError extends Error {
  readonly code = 'STAFF_INVITE_INVALID_TRANSITION';

  constructor(
    readonly from: StaffInviteStatus,
    readonly to: StaffInviteStatus,
  ) {
    super(`Staff invite cannot transition from ${from} to ${to}`);
    this.name = 'StaffInviteInvalidTransitionError';
  }
}
