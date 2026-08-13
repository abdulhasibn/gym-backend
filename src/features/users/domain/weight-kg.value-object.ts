/**
 * Weight in kilograms (numeric 5,2).
 */
export class WeightKg {
  private constructor(readonly value: number) {}

  static create(input: number): WeightKg {
    if (!Number.isFinite(input) || input <= 0 || input > 500) {
      throw new Error('Weight must be between 0 and 500 kg');
    }
    return new WeightKg(Math.round(input * 100) / 100);
  }
}
