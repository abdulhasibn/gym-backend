export class StaffInviteExpiredError extends Error {
  readonly code = 'STAFF_INVITE_EXPIRED';

  constructor(message = 'Staff invite has expired') {
    super(message);
    this.name = 'StaffInviteExpiredError';
  }
}
