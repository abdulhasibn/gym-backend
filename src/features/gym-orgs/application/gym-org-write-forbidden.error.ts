export class GymOrgWriteForbiddenError extends Error {
  readonly code = 'GYM_ORG_WRITE_FORBIDDEN';

  constructor(message = 'Not allowed to update this gym organization') {
    super(message);
    this.name = 'GymOrgWriteForbiddenError';
  }
}
