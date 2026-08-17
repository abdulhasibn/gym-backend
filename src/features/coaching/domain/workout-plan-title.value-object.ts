export class WorkoutPlanTitle {
  private constructor(readonly value: string) {}

  static create(input: string): WorkoutPlanTitle {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('Workout plan title cannot be empty');
    }
    if (trimmed.length > 120) {
      throw new Error('Workout plan title max 120 chars');
    }
    return new WorkoutPlanTitle(trimmed);
  }
}
