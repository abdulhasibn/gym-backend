export class ServingQuantity {
  private constructor(readonly value: number) {}

  static create(input: number): ServingQuantity {
    if (!Number.isFinite(input) || input <= 0 || input > 100) {
      throw new Error('Serving quantity must be between 0 and 100');
    }
    return new ServingQuantity(Math.round(input * 100) / 100);
  }
}
