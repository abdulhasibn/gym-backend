export class LeadName {
  private constructor(readonly value: string) {}

  static create(input: string): LeadName {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Lead name cannot be empty');
    }
    if (value.length > 255) {
      throw new Error('Lead name cannot exceed 255 characters');
    }

    return new LeadName(value);
  }
}
