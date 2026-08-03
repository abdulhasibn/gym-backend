import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { GymOrgCreationForbiddenError } from '../application/gym-org-creation-forbidden.error';

export const mapGymOrgError: ErrorMapper = (error) => {
  if (error instanceof GymOrgCreationForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }

  return null;
};
