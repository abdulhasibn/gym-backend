import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { CoachingAddonRequiredError } from '../application/coaching-addon-required.error';
import { RosterForbiddenError } from '../application/roster-forbidden.error';
import { ClientMembershipInvalidTransitionError } from '../domain/client-membership-invalid-transition.error';

export const mapRosterError: ErrorMapper = (error) => {
  if (error instanceof RosterForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof CoachingAddonRequiredError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof ClientMembershipInvalidTransitionError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
