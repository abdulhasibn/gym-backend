export class ActiveKcal {
  private constructor(readonly value: number) {}

  static create(input: number): ActiveKcal {
    if (!Number.isFinite(input) || input < 0 || input > 50_000) {
      throw new Error('Active kcal must be between 0 and 50,000');
    }
    return new ActiveKcal(Math.round(input * 10) / 10);
  }
}
