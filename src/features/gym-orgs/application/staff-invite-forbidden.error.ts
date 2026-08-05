export class StaffInviteForbiddenError extends Error {
  readonly code = 'STAFF_INVITE_FORBIDDEN';

  constructor(message = 'Not allowed to manage staff invites for this gym') {
    super(message);
    this.name = 'StaffInviteForbiddenError';
  }
}
