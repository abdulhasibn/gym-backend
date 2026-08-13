import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { UsersForbiddenError } from '../application/users-forbidden.error';
import { InvalidProfileError } from '../domain/invalid-profile.error';

export const mapUsersError: ErrorMapper = (error) => {
  if (error instanceof UsersForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof InvalidProfileError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
