import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { CoachingAddonRequiredError } from '../application/coaching-addon-required.error';
import { CoachingForbiddenError } from '../application/coaching-forbidden.error';
import { InvalidDietPlanError } from '../domain/invalid-diet-plan.error';

export const mapCoachingError: ErrorMapper = (error) => {
  if (error instanceof CoachingForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof CoachingAddonRequiredError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof InvalidDietPlanError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
