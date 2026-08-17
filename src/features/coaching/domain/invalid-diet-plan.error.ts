export class InvalidDietPlanError extends Error {
  readonly code = 'INVALID_DIET_PLAN';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidDietPlanError';
  }
}
