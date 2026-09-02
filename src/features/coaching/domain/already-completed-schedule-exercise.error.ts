export class AlreadyCompletedScheduleExerciseError extends Error {
  readonly code = 'ALREADY_COMPLETED_SCHEDULE_EXERCISE';

  constructor(message = 'This schedule exercise is already completed for the day') {
    super(message);
    this.name = 'AlreadyCompletedScheduleExerciseError';
  }
}
