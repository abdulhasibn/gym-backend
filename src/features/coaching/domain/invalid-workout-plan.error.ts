export class InvalidWorkoutPlanError extends Error {
  readonly code = 'INVALID_WORKOUT_PLAN';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkoutPlanError';
  }
}
