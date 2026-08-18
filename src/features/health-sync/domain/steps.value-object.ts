export class Steps {
  private constructor(readonly value: number) {}

  static create(input: number): Steps {
    if (!Number.isInteger(input) || input < 0 || input > 1_000_000) {
      throw new Error('Steps must be a non-negative integer up to 1,000,000');
    }
    return new Steps(input);
  }
}
