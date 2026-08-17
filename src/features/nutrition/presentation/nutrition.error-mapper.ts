import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { NutritionForbiddenError } from '../application/nutrition-forbidden.error';
import { AlreadyLoggedPrescribedError } from '../domain/already-logged-prescribed.error';
import { InvalidNutritionError } from '../domain/invalid-nutrition.error';

export const mapNutritionError: ErrorMapper = (error) => {
  if (error instanceof NutritionForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof AlreadyLoggedPrescribedError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof InvalidNutritionError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
