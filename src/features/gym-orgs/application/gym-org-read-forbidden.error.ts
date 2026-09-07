export class GymOrgReadForbiddenError extends Error {
  readonly code = 'GYM_ORG_READ_FORBIDDEN';

  constructor(message = 'Only client accounts can read their subscribed gym') {
    super(message);
    this.name = 'GymOrgReadForbiddenError';
  }
}
