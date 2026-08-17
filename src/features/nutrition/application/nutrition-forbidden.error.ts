export class NutritionForbiddenError extends Error {
  readonly code = 'NUTRITION_FORBIDDEN';

  constructor(message = 'Not allowed to access this nutrition data') {
    super(message);
    this.name = 'NutritionForbiddenError';
  }
}
