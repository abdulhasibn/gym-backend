export class PlanForbiddenError extends Error {
  readonly code = 'PLAN_FORBIDDEN';

  constructor(message = 'Not allowed to access plan catalog for this gym organization') {
    super(message);
    this.name = 'PlanForbiddenError';
  }
}
