import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { PlanForbiddenError } from '../application/plan-forbidden.error';
import { MembershipPlanDeletedError } from '../domain/membership-plan-deleted.error';

export const mapMembershipPlanError: ErrorMapper = (error) => {
  if (error instanceof PlanForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof MembershipPlanDeletedError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
