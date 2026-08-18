/**
 * Weight from wearable ingest (same bounds as profile weight).
 */
export class SyncWeightKg {
  private constructor(readonly value: number) {}

  static create(input: number): SyncWeightKg {
    if (!Number.isFinite(input) || input <= 0 || input > 500) {
      throw new Error('Weight must be between 0 and 500 kg');
    }
    return new SyncWeightKg(Math.round(input * 100) / 100);
  }
}
