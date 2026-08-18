export class WorkoutMinutes {
  private constructor(readonly value: number) {}

  static create(input: number): WorkoutMinutes {
    if (!Number.isInteger(input) || input < 0 || input > 24 * 60) {
      throw new Error('Workout minutes must be a non-negative integer up to 1440');
    }
    return new WorkoutMinutes(input);
  }
}
