export class LeadPhone {
  private constructor(readonly value: string) {}

  static create(input: string): LeadPhone {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Lead phone cannot be empty');
    }
    if (value.length > 32) {
      throw new Error('Lead phone cannot exceed 32 characters');
    }

    return new LeadPhone(value);
  }
}
