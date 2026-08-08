export class PlanPrice {
  private constructor(readonly value: number) {}

  static create(input: number): PlanPrice {
    if (!Number.isFinite(input)) {
      throw new Error('Plan price must be a finite number');
    }
    if (input < 0) {
      throw new Error('Plan price cannot be negative');
    }
    if (input > 9_999_999_999.99) {
      throw new Error('Plan price exceeds maximum');
    }

    const cents = Math.round(input * 100);
    if (Math.abs(input * 100 - cents) > 1e-6) {
      throw new Error('Plan price must have at most 2 decimal places');
    }

    return new PlanPrice(cents / 100);
  }
}
