export class InvalidStaffInviteeError extends Error {
  readonly code = 'INVALID_STAFF_INVITEE';

  constructor(message = 'Invitee is not a valid staff account for this invite') {
    super(message);
    this.name = 'InvalidStaffInviteeError';
  }
}
