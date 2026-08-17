export class AlreadyCompletedWorkoutExerciseError extends Error {
  readonly code = 'ALREADY_COMPLETED_WORKOUT_EXERCISE';

  constructor(message = 'This exercise is already completed for the day') {
    super(message);
    this.name = 'AlreadyCompletedWorkoutExerciseError';
  }
}
