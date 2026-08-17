export class DietPlanTitle {
  private constructor(readonly value: string) {}

  static create(input: string): DietPlanTitle {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('Diet plan title cannot be empty');
    }
    if (trimmed.length > 120) {
      throw new Error('Diet plan title max 120 chars');
    }
    return new DietPlanTitle(trimmed);
  }
}
