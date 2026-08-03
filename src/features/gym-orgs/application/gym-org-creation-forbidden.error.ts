export class GymOrgCreationForbiddenError extends Error {
  readonly code = 'GYM_ORG_CREATION_FORBIDDEN';

  constructor() {
    super('This account is not allowed to create a gym organization');
    this.name = 'GymOrgCreationForbiddenError';
  }
}
