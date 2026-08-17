export class InvalidNutritionError extends Error {
  readonly code = 'INVALID_NUTRITION';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidNutritionError';
  }
}
