export class PlanName {
  private constructor(readonly value: string) {}

  static create(input: string): PlanName {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Plan name cannot be empty');
    }
    if (value.length > 255) {
      throw new Error('Plan name cannot exceed 255 characters');
    }

    return new PlanName(value);
  }
}
