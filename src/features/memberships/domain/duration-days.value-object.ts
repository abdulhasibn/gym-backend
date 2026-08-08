export class DurationDays {
  private constructor(readonly value: number) {}

  static create(input: number): DurationDays {
    if (!Number.isInteger(input)) {
      throw new Error('Duration days must be an integer');
    }
    if (input < 1) {
      throw new Error('Duration days must be at least 1');
    }
    if (input > 3650) {
      throw new Error('Duration days cannot exceed 3650');
    }

    return new DurationDays(input);
  }
}
