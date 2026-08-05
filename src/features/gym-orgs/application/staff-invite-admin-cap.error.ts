export class StaffInviteAdminCapError extends Error {
  readonly code = 'STAFF_INVITE_ADMIN_CAP';

  constructor(message = 'This gym already has the maximum number of admins') {
    super(message);
    this.name = 'StaffInviteAdminCapError';
  }
}
