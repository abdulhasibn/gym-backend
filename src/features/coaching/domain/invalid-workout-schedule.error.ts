export class InvalidWorkoutScheduleError extends Error {
  readonly code = 'INVALID_WORKOUT_SCHEDULE';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkoutScheduleError';
  }
}
