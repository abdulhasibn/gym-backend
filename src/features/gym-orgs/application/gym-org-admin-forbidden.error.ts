export class GymOrgAdminForbiddenError extends Error {
  readonly code = 'GYM_ORG_ADMIN_FORBIDDEN';

  constructor(message = 'Not allowed to administer this gym organization') {
    super(message);
    this.name = 'GymOrgAdminForbiddenError';
  }
}
