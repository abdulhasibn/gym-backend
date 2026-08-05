export class StaffAlreadyAffiliatedError extends Error {
  readonly code = 'STAFF_ALREADY_AFFILIATED';

  constructor(message = 'Invitee is already affiliated with this gym') {
    super(message);
    this.name = 'StaffAlreadyAffiliatedError';
  }
}
