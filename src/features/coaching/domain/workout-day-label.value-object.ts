export class WorkoutDayLabel {
  private constructor(readonly value: string) {}

  static create(input: string): WorkoutDayLabel {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('Workout day label cannot be empty');
    }
    if (trimmed.length > 80) {
      throw new Error('Workout day label max 80 chars');
    }
    return new WorkoutDayLabel(trimmed);
  }
}
