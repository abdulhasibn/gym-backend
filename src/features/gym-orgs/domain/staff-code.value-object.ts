export class StaffCode {
  private constructor(readonly value: string) {}

  static create(input: string): StaffCode {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Staff code cannot be empty');
    }
    if (value.length > 64) {
      throw new Error('Staff code cannot exceed 64 characters');
    }

    return new StaffCode(value);
  }
}
