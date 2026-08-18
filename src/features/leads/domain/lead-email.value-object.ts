export class LeadEmail {
  private constructor(readonly value: string) {}

  static create(input: string): LeadEmail {
    const value = input.trim().toLowerCase();

    if (value.length === 0 || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error('Lead email is invalid');
    }

    return new LeadEmail(value);
  }
}
