/**
 * Height in centimetres (numeric 5,2).
 */
export class HeightCm {
  private constructor(readonly value: number) {}

  static create(input: number): HeightCm {
    if (!Number.isFinite(input) || input <= 0 || input > 300) {
      throw new Error('Height must be between 0 and 300 cm');
    }
    return new HeightCm(Math.round(input * 100) / 100);
  }
}
